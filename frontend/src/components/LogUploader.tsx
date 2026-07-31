"use client";

import { useState } from "react";

// Matches the JSON structure returned by our FastAPI backend
interface Anomaly {
  id: string;
  timestamp: string;
  sequenceId: string;
  threatLevel: string;
  logPreview: string;
  anomalyScore: number;
  eventChain: string[];
  explanation: string;
  modelConfidence: number;
  affectedService: string;
}

export default function LogUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a log file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // 1. Prepare the file for multipart/form-data upload
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 2. Call the FastAPI backend
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // 3. Parse the response and update the dashboard state
      const data = await response.json();

      if (data.status === "success") {
        setAnomalies(data.anomalies);
      } else {
        throw new Error("Backend failed to process the logs.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-xl">
        <input
          type="file"
          accept=".log,.txt,.csv"
          onChange={handleFileChange}
          className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />

        <button
          onClick={handleUpload}
          disabled={!file || isAnalyzing}
          className={`px-6 py-2 rounded-md font-bold transition-all ${
            isAnalyzing
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          {isAnalyzing ? "Analyzing ML Patterns..." : "Upload & Analyze"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Render the anomalies if we have them */}
      {anomalies.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">
            Detected Anomalies ({anomalies.length})
          </h2>
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className="bg-slate-800 p-4 rounded border border-red-500/30 shadow-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`px-2 py-1 text-xs font-bold rounded ${
                    anomaly.threatLevel === "HIGH"
                      ? "bg-red-500 text-white"
                      : "bg-orange-500 text-white"
                  }`}
                >
                  {anomaly.threatLevel} THREAT
                </span>
                <span className="text-slate-400 text-sm">
                  {anomaly.timestamp}
                </span>
              </div>

              <h3 className="text-lg font-mono text-red-400 mb-2">
                {anomaly.logPreview}
              </h3>

              <div className="bg-slate-900 p-3 rounded mb-3">
                <p className="text-slate-300 text-sm">
                  <span className="font-bold text-emerald-400">
                    Gemini LLM Diagnostic:
                  </span>{" "}
                  {anomaly.explanation}
                </p>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Model Confidence: {(anomaly.modelConfidence * 100).toFixed(1)}%
                | Sequence: {anomaly.sequenceId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
