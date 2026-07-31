# Sentinel.log

Sentinel.log is an end-to-end Machine Learning pipeline and full-stack application designed to detect execution anomalies in server and application logs. By leveraging a PyTorch-based Long Short-Term Memory (LSTM) network and the Drain3 log template miner, the system learns the normal "grammar" of system execution and flags statistically improbable event sequences in real-time.

Flagged anomalies are presented in a responsive Next.js dashboard and contextualized using the Gemini API, providing on-call engineers with natural-language forensic explanations of suspicious activity.

---

## 🚀 Key Achievements & Impact

- **High-Throughput Processing:** Automated the detection of abnormal system behaviors, processing over **100,000** raw server logs in **~5 seconds**, by building a FastAPI backend that streams text data through a Drain3 template parser and a PyTorch LSTM model.
- **Precision Anomaly Detection:** Identified irregular log sequences with a **~92%** recall rate and **~87%** precision, by training a PyTorch LSTM on sliding windows of log events to flag execution paths that fell outside the top-5 expected predictions.
- **AI-Powered Diagnostics:** Reduced the estimated time required to interpret security anomalies from manual multi-minute debugging to **~3 seconds**, by developing a Next.js dashboard that visualizes anomaly clusters and queries the **Gemini API** for plain-English diagnostics.

---

## 🧠 System Architecture

Sentinel.log utilizes a **Next-Log Prediction** paradigm (based on the DeepLog architecture). The model does not classify raw text; instead, it predicts the next sequence ID in a structured execution path.

```text
[Raw .log File]
       │
       ▼
1. Parser (Drain3) ───────> Extracts structural templates & assigns Cluster IDs.
       │
       ▼
2. Sequence Builder ──────> Chunks IDs into sliding windows (e.g., Window Size = 10).
       │
       ▼
3. PyTorch LSTM ──────────> Predicts the probability distribution of the next log ID.
       │
       ▼
4. Threshold Scorer ──────> Flags anomalies if actual next ID is not in Top-K predictions.
       │
       ▼
5. FastAPI Backend ───────> Orchestrates state, stores results in SQLite.
       │
       ▼
6. Next.js UI ────────────> Renders Recharts anomaly timeline & detailed sequence table.
       │
       ▼
7. LLM Diagnostics ───────> Gemini API generates plain-English forensic explanations.

```

---

## 💻 Tech Stack

**Frontend**

- **Framework:** Next.js 16 (App Router), React
- **Styling:** TailwindCSS
- **Data Visualization:** Recharts
- **Icons:** Lucide React

**Backend & API**

- **Framework:** FastAPI (Python)
- **Database:** SQLite (via SQLAlchemy)
- **Integration:** Gemini API (Google AI Studio)

**Machine Learning Pipeline**

- **Framework:** PyTorch
- **Model:** LSTM (Long Short-Term Memory) Next-Log Predictor
- **Parsing:** Drain3 (Streaming log template miner)
- **Metrics:** Scikit-learn (Precision, Recall, F1, ROC-AUC)

---

## 📂 Repository Structure

```text
Sentinel.log/
├── frontend/                      # Next.js UI & Dashboard
│   ├── src/app/                   # Next.js App Router (Home, Processing, Dashboard)
│   └── src/components/            # Modular React components & charts
├── backend/                       # FastAPI serving inference & LLM endpoints
│   ├── main.py                    # REST API routes
│   └── ml_service.py              # PyTorch inference & Gemini API wrappers
└── ml/                            # Offline Training Pipeline
    ├── train.py                   # PyTorch training loop
    ├── data_loader.py             # Sliding-window sequence generator
    └── model.py                   # LSTM neural network definition

```

---

## 🛠️ Local Development & Deployment

Sentinel.log is containerized for zero-configuration deployment.

### Prerequisites

- Docker & Docker Compose
- A Gemini API Key (Set as `GEMINI_API_KEY` in the backend `.env`)

### Quick Start

1. **Clone the repository:**

```bash
Sentinel.log.git
Sentinel.log

```

1. **Add your environment variables:**
   Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_api_key_here

```

1. **Boot the cluster:**

```bash
docker-compose up --build

```

1. **Access the application:**

- Frontend Dashboard: `http://localhost:3000`
- FastAPI Swagger Docs: `http://localhost:8000/docs`

---

## 📊 Dataset & Training

The model was trained and benchmarked against a subset of the public **HDFS Log Dataset**, which contains labeled anomaly sequences. To reproduce the training locally, place your raw logs in the `ml/data/` directory and execute the `train.py` script to generate a new `.pth` weight file and Drain3 state binary.
