import datetime
import os
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml_service import LogAnalysisPipeline

app = FastAPI(title="Sentinel.log API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the PyTorch LSTM (and optional Gemini client) into memory once at startup
pipeline = LogAnalysisPipeline()


class ExplainRequest(BaseModel):
    sequenceId: str
    eventChain: list[str]
    actualEvent: str
    expectedEvents: list[str] = []
    affectedService: str = "unknown"


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_loaded": pipeline.model is not None,
        "vocab_size": pipeline.vocab_size,
        "llm_enabled": pipeline.client is not None,
    }


# Plain `def` endpoints run in FastAPI's threadpool, so CPU-bound inference
# and the blocking Gemini call don't stall the event loop.
@app.post("/api/analyze")
def analyze_logs(file: UploadFile = File(...)):
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    log_lines = content.decode("utf-8", errors="replace").splitlines()

    anomalies = pipeline.process_logs(log_lines)

    now = datetime.datetime.now()
    formatted_results = []
    for anomaly in anomalies:
        ts = anomaly["timestamp"] or now
        formatted_results.append({
            "id": str(uuid.uuid4()),
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "sequenceId": anomaly["sequenceId"],
            "threatLevel": anomaly["threatLevel"],
            "logPreview": anomaly["logPreview"],
            "anomalyScore": anomaly["anomalyScore"],
            "eventChain": anomaly["eventChain"],
            "rawEventChain": anomaly["rawEventChain"],
            "actualEvent": anomaly["actualEvent"],
            "expectedEvents": anomaly["expectedEvents"],
            "explanation": anomaly["explanation"],
            "modelConfidence": anomaly["confidence"],
            "affectedService": anomaly["affectedService"],
        })

    return {
        "status": "success",
        "fileName": file.filename,
        "linesProcessed": len(log_lines),
        "anomalies": formatted_results,
    }


@app.post("/api/explain")
def explain_anomaly(req: ExplainRequest):
    explanation = pipeline.generate_explanation(
        req.eventChain, req.actualEvent, req.expectedEvents
    )
    return {"sequenceId": req.sequenceId, "explanation": explanation}
