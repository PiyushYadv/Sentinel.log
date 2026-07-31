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

pipeline = LogAnalysisPipeline()

@app.post("/api/analyze")
async def analyze_logs(file: UploadFile = File(...)):
  content = await file.read()
  log_lines = content.decode("utf-8").split("\n")
  
  # Run the ML inference on raw text lines
  anomalies = pipeline.process_logs(log_lines)
  
  formatted_results = []
  for anomaly in anomalies:
    formatted_results.append({
      "id": str(uuid.uuid4()),
      "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      "sequenceId": anomaly["sequenceId"],
      "threatLevel": anomaly["threatLevel"],
      "logPreview": anomaly["logPreview"],
      "anomalyScore": anomaly["anomalyScore"],
      "eventChain": anomaly["eventChain"],
      "explanation": anomaly["explanation"],
      "modelConfidence": round(1.0 - anomaly["anomalyScore"], 2),
      "affectedService": anomaly["affectedService"]
    })
      
  return {"status": "success", "anomalies": formatted_results}