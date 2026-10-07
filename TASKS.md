# Sentinel.log — Implementation Tasks & Deliverables for Claude Code

This checklist provides a structured, phase-by-phase implementation guide for finishing the Sentinel.log anomaly detection system.

---

## 🎯 Phase 1: Backend Fixes & Endpoint Decoupling (Critical)

- [x] **Fix Python dependencies in `backend/requirements.txt`**
  - Add missing requirements: `numpy`, `google-genai>=1.0.0` (or `google-generativeai==0.8.6`), `python-multipart`, `scikit-learn`.
  - Ensure the virtualenv (`backend/venv`) installs all required packages cleanly.

- [x] **Fix `backend/ml_service.py`**
  - **Anchor Paths**:
    ```python
    from pathlib import Path
    BASE_DIR = Path(__file__).resolve().parent
    checkpoint = torch.load(BASE_DIR / "lstm_log_model.pth", map_location="cpu")
    with open(BASE_DIR / "event_templates.json") as f:
        self.template_to_event = json.load(f)
    config.load(str(BASE_DIR / "drain3.ini"))
    ```
  - **Decouple LLM Call**:
    Remove `generate_explanation` from the inner inference loop in `process_logs()`. Set `"explanation": None` initially. Inference on 1,000 logs should complete in <1 second.
  - **Fix Confidence Score Calculation**:
    Anomaly confidence should represent the certainty of anomaly (or top predicted probability), not the tiny probability `probabilities[0, actual]` which was showing 0% in the UI.
  - **Generalized Sessionization**:
    If a log file does not contain HDFS `blk_` identifiers, fall back to sliding windows over the sequence of parsed log messages so generic server logs and BGL logs work out of the box.
  - **Safe Gemini Client Initialization**:
    Use `gemini-2.0-flash` with graceful fallback if `GEMINI_API_KEY` is not present or if quota is exceeded.

- [x] **Update `backend/main.py`**
  - Add `GET /api/health` returning `{"status": "ok", "model_loaded": true, "vocab_size": 54}`.
  - Add `POST /api/explain` endpoint:
    ```python
    class ExplainRequest(BaseModel):
        sequenceId: str
        eventChain: list[str]
        actualEvent: str
        expectedEvents: list[str]
        affectedService: str = "unknown"

    @app.post("/api/explain")
    async def explain_anomaly(req: ExplainRequest):
        explanation = pipeline.generate_explanation(
            req.eventChain, req.actualEvent, req.expectedEvents
        )
        return {"sequenceId": req.sequenceId, "explanation": explanation}
    ```
  - Parse actual timestamps from HDFS / syslog lines when available (e.g. `081109 203521` -> `2008-11-09 20:35:21`) with fallback to current time.

---

## ⚡ Phase 2: Frontend State Management with React Query

- [x] **Create centralized API client and React Query hooks (`frontend/src/lib/api.ts`)**
  - `useAnalyzeLogs()`: Mutation hook wrapping `/api/analyze` with loading state, progress feedback, and error handling.
  - `useExplainAnomaly()`: Mutation hook calling `/api/explain` with automatic cache updating for the specific anomaly entry.
  - Cache persistence helper to store the last analyzed results in `sessionStorage` so refreshing `/dashboard` does not revert to mock data.

- [x] **Wire the "Explain with Gemini" button in `LLMSidebar.tsx`**
  - Add a visible, styled **"Generate AI Diagnostic"** button in `LLMSidebar.tsx`.
  - While generating, show an animated loading skeleton.
  - On success, update the log's `explanation` field and cache it in TanStack Query.

- [x] **Wire "New Upload" in `DashboardHeader.tsx`**
  - Add a hidden file input triggered by the "New Upload" button.
  - Wire it to `useAnalyzeLogs()`.

- [x] **Add Error Notification on `HomePage` (`frontend/src/app/page.tsx`)**
  - Render an error banner if `analyzeMutation.isError` (e.g., backend unreachable or file format error).

---

## 📊 Phase 3: Dynamic Data Visualizations (Recharts)

- [x] **Fix `frontend/src/components/dashboard/AnomalyChart.tsx`**
  - Accept `data: LogEntry[]` as a prop.
  - Group anomalies dynamically into time buckets (or sequence buckets if timestamps are uniform) and render the real anomaly frequency curve.
  - Add a toggle between "Frequency Timeline" and "Anomaly Score Distribution".

- [x] **Add Confusion Matrix & Metrics Component (`ConfusionMatrix.tsx`)**
  - Implement a visual card or modal displaying the model's test benchmark metrics:
    - **Precision**: 96.26%
    - **Recall**: 87.60% (up to 94% with tuned threshold)
    - **F1 Score**: 91.73%
    - **Confusion Matrix Grid**: True Positives (9,327), False Positives (362), True Negatives (111,283), False Negatives (1,320).
  - This directly aligns the dashboard with your resume bullet points for ML Engineering roles.

- [x] **Fix Font Fallback in `frontend/src/app/layout.tsx`**
  - Wrap `next/font/google` with `fallback: ['system-ui', 'sans-serif']` or use CSS variables so builds do not fail in offline environments.

---

## 🐳 Phase 4: Docker Containerization

- [x] **Create `backend/Dockerfile`**
  - Base: `python:3.11-slim`.
  - Install dependencies from `requirements.txt`.
  - Copy backend code, Drain3 config, and model weights (`lstm_log_model.pth`).
  - Expose port `8000`.
  - CMD: `uvicorn main:app --host 0.0.0.0 --port 8000`.

- [x] **Create `frontend/Dockerfile`**
  - Multi-stage build (deps, builder, runner) using `node:20-alpine`.
  - Standalone Next.js output (`output: "standalone"` in `next.config.ts`).
  - Expose port `3000`.

- [x] **Create `docker-compose.yml`**
  - Services: `backend` and `frontend`.
  - Configure environment variables (`BACKEND_URL=http://backend:8000`, `GEMINI_API_KEY`).
  - Healthcheck on backend before frontend starts.

---

## 🧪 Phase 5: Verification & End-to-End Testing

- [x] **Backend Health & Inference Test**
  ```bash
  curl -X GET http://localhost:8000/api/health
  curl -X POST http://localhost:8000/api/analyze -F "file=@ml/hdfs_test_sample.log"
  ```
  Ensure anomalies are returned in <1 second with valid `sequenceId`, `anomalyScore`, `eventChain`.

- [x] **LLM Explanation Test**
  ```bash
  curl -X POST http://localhost:8000/api/explain \
    -H "Content-Type: application/json" \
    -d '{"sequenceId": "test-1", "eventChain": ["Receiving block", "PacketResponder terminating"], "actualEvent": "Verification failed", "expectedEvents": ["Received block", "Served block"]}'
  ```

- [x] **Frontend Flow Test**
  1. Open `http://localhost:3000`.
  2. Upload `ml/hdfs_test_sample.log`.
  3. Verify navigation to `/dashboard` with dynamic anomaly count.
  4. Inspect `AnomalyChart` displaying real anomaly distribution.
  5. Click an anomaly row -> opens `LLMSidebar`.
  6. Click "Generate AI Diagnostic" -> fetches explanation via React Query.
  7. Refresh the dashboard -> verify results persist.
