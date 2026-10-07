# Sentinel.log — Claude Code Runbook & Architecture Guide

Sentinel.log is an end-to-end Machine Learning pipeline and full-stack application designed to detect execution anomalies in server and application logs using a **Next-Log Prediction** paradigm (PyTorch LSTM + Drain3 miner + FastAPI + Next.js + Gemini LLM).

---

## 🛠️ Essential Commands

### Backend (FastAPI + PyTorch)
```bash
# Navigate to backend and activate virtualenv
cd backend
source venv/bin/activate

# Install / update backend dependencies
pip install -r requirements.txt

# Run backend development server (Port 8000)
uvicorn main:app --reload --port 8000

# Test backend health / imports
python -c "from ml_service import LogAnalysisPipeline; print('ML Pipeline OK')"
```

### Frontend (Next.js 16 + React 19 + TanStack Query)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Production build and lint
npm run build
npm run lint
```

### ML Offline Pipeline (Training & Evaluation)
```bash
# Navigate to ml directory
cd ml
source venv/bin/activate  # or use backend/venv

# 1. Parse raw logs into Drain3 templates & sequences
python parser.py

# 2. Train the PyTorch LSTM model
python train.py

# 3. Evaluate model against ground truth HDFS anomaly labels
python evaluate.py
```

### Docker (Full Stack)
```bash
# Build and run complete multi-container stack
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### Deployment (Hugging Face Spaces)
```bash
# Build & run the single-container Space image locally (repo root as context)
docker build -f deploy/huggingface/Dockerfile -t sentinel-hf .
docker run --rm -p 7860:7860 --env-file backend/.env sentinel-hf   # http://localhost:7860
```
- `deploy/huggingface/`: Space Dockerfile, `start.sh` (Next.js on :7860 proxies to uvicorn on 127.0.0.1:8000), and the Space README (YAML config).
- `.github/workflows/deploy-huggingface.yml` uploads the Space on every push to `main`. It needs the repo **secret** `HF_TOKEN` (write access) and the repo **variable** `HF_SPACE` (e.g. `username/sentinel-log`).
- Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) as **Space secrets/variables** in the HF Space settings.

---

## 📐 High-Level Architecture & Data Flow

```text
[Raw Log File (.log, .txt, .csv)]
       │
       ▼
[Next.js Upload Component]
       │  (TanStack Query useAnalyzeLogs mutation)
       ▼
[Next.js API Route Proxy (/api/analyze)]
       │  (Multipart Form-Data forwarded to FastAPI)
       ▼
[FastAPI /api/analyze Endpoint]
       │
       ├──> 1. Drain3 Parser: Mines structural templates & assigns Cluster IDs
       ├──> 2. Sessionizer: Groups logs by BlockId (or consecutive sliding windows)
       ├──> 3. Sequence Generator: Chunks events into sliding windows (Window Size = 10)
       ├──> 4. PyTorch LSTM: Predicts probability distribution of next log token
       └──> 5. Top-K Threshold Scorer (K = 4): Flags anomaly if actual token not in Top-K
       │
       ▼
[FastAPI returns flagged anomalies (<1s, NO synchronous LLM call)]
       │
       ▼
[Next.js Dashboard State (TanStack Query Cache)]
       ├──> MetricCards: Real anomaly counts, threat breakdown, system health score
       ├──> AnomalyChart (Recharts): Real dynamic timeline of anomaly frequencies
       ├──> ConfusionMatrix (Recharts): Precision (96.2%), Recall (87.6%), F1 (91.7%)
       └──> LogTable: Flagged sequence inspection
              │
              ▼ (User selects row & clicks "Explain with Gemini")
[TanStack Query useExplainAnomaly mutation]
       │
       ▼
[FastAPI /api/explain Endpoint]
       │  (Hits Google Gemini Flash — GEMINI_MODEL — with sequence context)
       ▼
[LLMSidebar]: Plain-English forensic explanation rendered on-demand
```

---

## 🚨 Critical Known Issues & Implementation Directives

### 1. Backend Import & Gemini Crash
- **Location**: `backend/ml_service.py`
- **Bug**: `from google import genai` crashes with `ImportError` (only `google-generativeai` was installed).
- **Fix**: Standardize on `google-genai`. Handle missing `GEMINI_API_KEY` gracefully with a clear mock explanation message so offline development works.
- **Note**: `gemini-2.0-flash` is retired (404). The model is set by `GEMINI_MODEL` (default `gemini-flash-latest`); calls time out after 20s and retry once on 503 before falling back to the offline explanation.

### 2. Decouple LLM from `/api/analyze` to Dedicated `/api/explain`
- **Location**: `backend/ml_service.py` & `backend/main.py`
- **Bug**: Synchronously calling Gemini inside the anomaly detection loop causes upload requests to take 60-120s and timeout.
- **Fix**: Remove `generate_explanation()` from `process_logs()`. Keep `/api/analyze` pure ML (<1 second). Expose a dedicated `POST /api/explain` endpoint for on-demand inspection.

### 3. Path Resolution in Backend
- **Location**: `backend/ml_service.py`
- **Bug**: Relative paths (`lstm_log_model.pth`, `event_templates.json`, `drain3.ini`) fail when uvicorn is launched from the workspace root.
- **Fix**: Anchor all file paths to `BASE_DIR = Path(__file__).resolve().parent`.

### 4. Sample Test Dataset
- **Location**: `ml/hdfs_sample.log`
- **Bug**: Only 10 lines from 8 different blocks; fails `window_size = 10` filter, resulting in 0 anomalies.
- **Fix**: Use `ml/hdfs_test_sample.log` (223 lines for anomalous block `blk_-3544583377289625738`) for verified end-to-end testing.

### 5. Frontend React Query Implementation
- **Location**: `frontend/src/app/page.tsx`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/lib/api.ts`
- **Issues**:
  - `initialData: mockLogEntries` wipes uploaded anomalies on page refresh.
  - Error state on upload mutation is swallowed silently without user notification.
  - No mutation for LLM explanation.
- **Fix**:
  - Implement reusable hooks in `frontend/src/lib/api.ts`: `useAnalyzeLogs()` and `useExplainAnomaly()`.
  - Persist analysis results in `sessionStorage` or cache so refreshing `/dashboard` preserves data.
  - Wire interactive "Explain" button in `LLMSidebar.tsx`.
  - Wire "New Upload" button in `DashboardHeader.tsx`.

### 6. Dynamic Recharts & Confusion Matrix
- **Location**: `frontend/src/components/dashboard/AnomalyChart.tsx`
- **Bug**: Ignores `data` prop and hardcodes `mockData.ts`.
- **Fix**: Calculate real time-bucketed or sequence-bucketed anomaly counts from the real `anomalies` array.
- **Feature**: Add a Confusion Matrix modal / card reflecting benchmark metrics (Precision: 96.26%, Recall: 87.60%, F1: 91.73%, TP: 9327, FP: 362, TN: 111283, FN: 1320).

### 7. Dockerization
- **Files**: `docker-compose.yml`, `frontend/Dockerfile`, `backend/Dockerfile`
- **Fix**: Create production Dockerfiles and compose configuration connecting frontend (`:3000`) and backend (`:8000`).

---

## 📋 Environment Variables

### Backend (`backend/.env`)
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest   # optional; e.g. gemini-3.8-flash if the alias is overloaded
PORT=8000
HOST=0.0.0.0
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
```
*(In Docker compose, set `BACKEND_URL=http://backend:8000`)*
