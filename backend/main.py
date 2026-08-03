from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ml_service import LogAnalysisPipeline
import datetime
import uuid

app = FastAPI(title="Sentinel.log API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the PyTorch LSTM and Gemini API into memory once at startup
pipeline = LogAnalysisPipeline()

@app.post("/api/analyze")
async def analyze_logs(file: UploadFile = File(...)):
    content = await file.read()
    log_lines = content.decode("utf-8").split("\n")
    
    # Run the ML inference on raw text lines (now with BlockId sessionization!)
    anomalies = pipeline.process_logs(log_lines)
    
    formatted_results = []
    for anomaly in anomalies:
        formatted_results.append({
            "id": str(uuid.uuid4()),
            # Note: For MVP, we assign the current time. For V2, we could parse this from the log line!
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sequenceId": anomaly["sequenceId"], 
            "threatLevel": anomaly["threatLevel"],
            "logPreview": anomaly["logPreview"],
            "anomalyScore": anomaly["anomalyScore"],
            "eventChain": anomaly["eventChain"],
            "explanation": anomaly["explanation"],
            "modelConfidence": anomaly["confidence"], # Uses the exact value from PyTorch now
            "affectedService": anomaly["affectedService"]
        })
        
    return {"status": "success", "anomalies": formatted_results}