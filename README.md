# Sentinel.log

Sentinel.log is an end-to-end Machine Learning pipeline and full-stack application designed to detect execution anomalies in server and application logs. By leveraging a PyTorch-based Long Short-Term Memory (LSTM) network and the Drain3 log template miner, the system learns the normal "grammar" of system execution and flags statistically improbable event sequences in real time.

Flagged anomalies are presented in a responsive Next.js dashboard and can be explained on demand with the Gemini API, giving on-call engineers natural-language forensic explanations of suspicious activity.

---

## 🚀 Key Achievements & Impact

- **High-Throughput Processing:** Automated the detection of abnormal system behaviors, processing over **100,000** raw server logs in **~5 seconds**, by building a FastAPI backend that streams text data through a Drain3 template parser and a PyTorch LSTM model.
- **Precision Anomaly Detection:** Identified irregular log sequences with **~87.60%** recall and **~96.26%** precision (F1 **~91.73%**), by training a PyTorch LSTM on sliding windows of log events to flag execution paths that fell outside the top-4 expected predictions.
- **AI-Powered Diagnostics:** Reduced the estimated time required to interpret security anomalies from manual multi-minute debugging to **~3 seconds**, by developing a Next.js dashboard that visualizes anomaly clusters and queries the **Gemini API** for plain-English diagnostics.

---

## 🧠 System Architecture

Sentinel.log uses a **Next-Log Prediction** paradigm (based on the DeepLog architecture). The model does not classify raw text; instead, it predicts the next event ID in a structured execution path.

```text
[Raw .log / .txt / .csv file]
       │
       ▼
1. Next.js Upload ────────> Sends the file through the /api/analyze route proxy.
       │
       ▼
2. Parser (Drain3) ───────> Extracts structural templates & assigns Cluster IDs.
       │
       ▼
3. Sessionizer ───────────> Groups events by HDFS BlockId (or consecutive windows).
       │
       ▼
4. Sequence Builder ──────> Chunks IDs into sliding windows (Window Size = 10).
       │
       ▼
5. PyTorch LSTM ──────────> Predicts the probability distribution of the next log ID.
       │
       ▼
6. Top-K Scorer (K = 4) ──> Flags an anomaly if the actual next ID is not in the Top-K.
       │
       ▼
7. Next.js Dashboard ─────> Metric cards, Recharts anomaly timeline, confusion matrix
       │                    and a sequence table.
       ▼
8. LLM Diagnostics ───────> On demand via POST /api/explain, Gemini generates a
                            plain-English forensic explanation of the selected anomaly.
```

`/api/analyze` is pure ML and returns in about a second; Gemini is only called when you click **Explain** on a flagged sequence. Without a `GEMINI_API_KEY`, the backend returns an offline explanation so local development still works.

---

## 💻 Tech Stack

**Frontend**

- **Framework:** Next.js 16 (App Router), React 19
- **Data Fetching:** TanStack Query
- **Styling:** Tailwind CSS 4
- **Data Visualization:** Recharts
- **Icons:** Lucide React

**Backend & API**

- **Framework:** FastAPI (Python), Uvicorn
- **LLM Integration:** Google Gemini via `google-genai` (model set by `GEMINI_MODEL`, default `gemini-flash-latest`)

**Machine Learning Pipeline**

- **Framework:** PyTorch
- **Model:** LSTM Next-Log Predictor
- **Parsing:** Drain3 (streaming log template miner)
- **Metrics:** scikit-learn (Precision, Recall, F1)

---

## 📂 Repository Structure

```text
Sentinel.log/
├── frontend/                      # Next.js UI & dashboard
│   ├── src/app/                   # App Router pages (Home, Dashboard) & API route proxies
│   ├── src/components/            # Dashboard, home & shared React components
│   └── src/lib/api.ts             # TanStack Query hooks (useAnalyzeLogs, useExplainAnomaly)
├── backend/                       # FastAPI inference & LLM service
│   ├── main.py                    # REST routes: /api/health, /api/analyze, /api/explain
│   ├── ml_service.py              # Drain3 + LSTM pipeline & Gemini wrapper
│   └── lstm_log_model.pth         # Trained model weights (+ templates, mapping, drain3.ini)
├── ml/                            # Offline training pipeline
│   ├── parser.py                  # Drain3 parsing into templates & sequences
│   ├── data_loader.py             # Sliding-window sequence generator
│   ├── model.py                   # LSTM network definition
│   ├── train.py                   # PyTorch training loop
│   ├── evaluate.py                # Evaluation against HDFS anomaly labels
│   └── hdfs_test_sample.log       # Sample log with a known anomalous block
├── docker-compose.yml             # Full stack: frontend (:3000) + backend (:8000)
└── render.yaml                    # Render Blueprint for the backend
```

---

## 🛠️ Local Development

### Prerequisites

- Docker & Docker Compose (or Python 3.11+ and Node.js 20+ to run without Docker)
- A Gemini API key (optional; without it, explanations fall back to an offline message)

### Quick Start (Docker)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/PiyushYadv/Sentinel.log.git
   cd Sentinel.log
   ```

2. **Add your environment variables** in `backend/.env`:

   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-flash-latest   # optional
   ```

3. **Boot the stack:**

   ```bash
   docker-compose up --build
   ```

4. **Open the application:**

   - Frontend dashboard: `http://localhost:3000`
   - FastAPI Swagger docs: `http://localhost:8000/docs`

5. **Try it out:** upload `ml/hdfs_test_sample.log`, which contains the anomalous block `blk_-3544583377289625738`.

### Without Docker

```bash
# Backend (port 8000)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
# Frontend (port 3000), in a second terminal
cd frontend
npm install
echo "BACKEND_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## ☁️ Deployment

- **Backend → Render:** create a Blueprint from `render.yaml` (Docker, free plan, health check `/api/health`) and set `GEMINI_API_KEY` when prompted. The container listens on `$PORT`.
- **Frontend → Vercel:** set the Root Directory to `frontend` and add `BACKEND_URL=https://<your-render-service>.onrender.com` and `NEXT_PUBLIC_MAX_UPLOAD_MB=4` (Vercel Functions reject request bodies over 4.5 MB).

Render's free tier sleeps after inactivity, so the first request can be slow; the frontend pings `/api/health` on load to wake it.

---

## 📊 Dataset & Training

The model was trained and benchmarked on the public **HDFS Log Dataset**, which includes labeled anomalous blocks. Benchmark results:

| Metric    | Value  |
| --------- | ------ |
| Precision | 96.26% |
| Recall    | 87.60% |
| F1 Score  | 91.73% |
| TP / FP   | 9,327 / 362 |
| TN / FN   | 111,283 / 1,320 |

To reproduce training, place the raw `HDFS.log` and `anomaly_label.csv` in `ml/` and run:

```bash
cd ml
python parser.py     # Drain3 templates & sequences -> ml/data/
python train.py      # Train the LSTM -> ml/saved_models/lstm_log_model.pth
python evaluate.py   # Precision / Recall / F1 against ground-truth labels
```

Copy the new weights and template files into `backend/` to serve the retrained model.
