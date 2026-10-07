# Sentinel.log — Next Steps & Suggestions

Follow-up work identified after completing Phases 1–5 in [TASKS.md](TASKS.md).
Ordered roughly by impact. Nothing here is required for the current HDFS demo to work.

---

## 1. Retraining: support for non-HDFS logs (decision pending)

**Problem.** The LSTM was trained only on HDFS (`ml/HDFS.log` + `ml/anomaly_label.csv`, the only
training data on disk). Its vocabulary is 54 HDFS event templates. On any other log format, almost
every template maps to `<UNK>`, so almost every window is flagged — in testing, 213 of 213 windows
on a non-HDFS file. Retraining on the same HDFS data will not fix this.

Three options, which can be combined:

### Option A — Self-train per upload *(recommended first step)*
- When an upload has no `blk_` IDs and most templates map to `<UNK>`, train a small LSTM on the
  uploaded file itself (same architecture as `ml/model.py`, few epochs, CPU), then score it with
  the same Top-K rule.
- The file's own vocabulary is built from Drain3 templates mined during the request.
- **Pros:** works on any log format; no new data or downloads; reuses existing code.
- **Cons:** unsupervised — if most of a file is failures, failures look "normal". Adds a few
  seconds per upload (cap epochs and windows; consider a background job and progress UI).
- **Touches:** `backend/ml_service.py` (new code path plus format detection),
  `ml/model.py` and `ml/train.py` (share the training loop), the `/api/analyze` response
  (`modelSource: "pretrained-hdfs" | "self-trained"`), and a dashboard badge showing which model ran.

### Option B — Train on public Loghub datasets
- Download labelled datasets from [Loghub](https://github.com/logpai/loghub) (e.g. BGL,
  Thunderbird, OpenSSH, Apache) and train **one model per system**. Template vocabularies are
  system-specific, so one global model will not work well.
- Add format auto-detection on upload (header regexes, or which model's vocabulary has the
  lowest `<UNK>` rate) to route each file to the right model.
- **Pros:** real precision/recall per system, which is strong for a resume/benchmark story.
- **Cons:** large downloads (BGL is ~700 MB, Thunderbird is tens of GB), long training runs, and
  each system needs its own sessionization rule (BGL uses node or time windows, not block IDs).

### Option C — Retune the HDFS model only
- Sweep `TOP_K` (currently 4) and the number of epochs in `ml/train.py`, and pick a threshold for
  higher recall (TASKS.md notes "up to ~94% recall with tuned threshold").
- **Pros:** cheap; improves the headline HDFS numbers.
- **Cons:** does nothing for other log formats. If benchmark numbers change, update
  `frontend/src/components/dashboard/ConfusionMatrix.tsx` and the CLAUDE.md metrics.

**Also consider:** the training pipeline has `<UNK>` = 0 in the vocabulary but never trains on it
(all training events are known). Masking a few percent of training tokens as `<UNK>` would make the
model degrade more gracefully on unseen templates.

---

## 2. Dashboard accuracy & honesty

- **"Total Blocks Analyzed" card is hardcoded** to `122,292` (the benchmark size) in
  `frontend/src/components/dashboard/MetricCards.tsx`. Use the upload's real numbers instead:
  `linesProcessed` (already returned by `/api/analyze`) and the number of sessions/blocks
  (add it to the response).
- **The LSTM/GRU model toggle is cosmetic.** No GRU model exists; switching only changes labels.
  Either train a GRU variant (`nn.GRU` in `ml/model.py`) and route by `activeModel`, or remove
  the toggle.
- **Home-page stats are placeholders** in `frontend/src/app/page.tsx` ("4.8B+ log events",
  "99.1% detection precision", "<340ms", "62×"). The 99.1% precision contradicts the real
  benchmark (96.26%). Replace them with real figures, e.g. 96.26% precision / 91.73% F1, ~40 ms
  for 223 lines and ~1.6 s for 50k lines (measured), 54-template vocabulary.
- **Home-page "Live Preview" chart and table use mock data** (`MiniChart.tsx`,
  `logEntries` from `mockData.ts`). Fine for a landing page, but label them as a sample.
- **"Mark as Incident" and "Full Trace" buttons** in `LLMSidebar.tsx` have no handlers. Wire them
  up (e.g. "Full Trace" opens every raw line for that block/session) or remove them.

---

## 3. Explanations (Gemini)

- **The LLM receives templates, not raw lines.** `useExplainAnomaly` sends `eventChain` (Drain3
  templates). Raw lines (now available as `rawEventChain`) contain IPs, sizes and paths that could
  make diagnostics more specific. Trade-off: raw lines may contain sensitive data sent to a third
  party, so consider an opt-in toggle or redaction.
- **Model availability is flaky.** The `gemini-flash-latest` alias returned repeated 503/504 errors
  during testing while `gemini-3.8-flash` responded. Options: set `GEMINI_MODEL` in
  `backend/.env`, or try a list of models in order before falling back to the offline text.
- **Worst-case latency is ~20–35 s** (20 s timeout plus one 503 retry). Streaming the response
  (`generate_content_stream`, forwarded through the Next.js route) would show text as it arrives.
- **Cache explanations server-side** by `(actualEvent, expectedEvents, eventChain)` hash; identical
  anomalies recur often in HDFS, which would cut Gemini calls and cost.

---

## 4. Charts

- **Table view for the chart.** The dataviz guidelines expect every chart to have an accessible
  table twin. The `LogTable` covers individual anomalies, but the bucketed counts behind the
  timeline/histogram aren't available as a table.
- **The timeline groups all sessions together.** For HDFS it could stack or facet by block, or
  let you click a bar to filter `LogTable` to that time bucket.

---

## 5. Backend robustness

- **The public Space spends your Gemini quota.** Anyone can trigger `/api/explain`. Add a simple
  per-IP rate limit (e.g. `slowapi`), make the Space private, or require a passphrase for
  LLM calls.

- **Upload size limit.** `/api/analyze` reads the whole file into memory. Add a max size (e.g. 50 MB)
  with a clear 413 error, and/or stream lines.
- **Performance at scale.** About 1.6 s per 50k lines today; the 1.5 GB `HDFS.log` would take
  minutes. For large files, consider background jobs plus polling, or chunked batching in
  `process_logs`.
- **Pin Python dependencies.** `backend/requirements.txt` is unpinned, so a future `torch` or
  `google-genai` release could break the Docker build. Pin known-good versions
  (e.g. via `pip freeze`).
- **Tests.** There are none yet. Good first candidates: `parse_line()` (HDFS, ISO and syslog
  formats), `process_logs()` on `ml/hdfs_test_sample.log` (expects 1 HIGH anomaly at
  `blk_-3544583377289625738-SEQ-3`), and the `/api/explain` offline fallback when
  `GEMINI_API_KEY` is unset.

---

## 6. Repo hygiene

- ~~Commit the work~~, ~~untrack `backend/__pycache__`~~, ~~commit `frontend/package-lock.json`~~
  — done on branch `feat/phases-1-5-deploy`.
- **README metrics are out of date.** `README.md` claims ~92% recall / ~87% precision with
  top-5 predictions and "100,000 logs in ~5 seconds". The current benchmark is 87.60% recall /
  96.26% precision with top-4, and about 1.6 s per 50k lines was measured. Align the README
  (and any resume bullets) with the real numbers.
- **`*.log` is gitignored**, so `ml/hdfs_test_sample.log` isn't in the repo. Visitors to the
  deployed Space have no sample to try. Consider committing it (e.g. `git add -f`) and adding a
  "Try with sample log" button that uploads it.
- **Remove the unused `frontend/src/components/LogUploader.tsx`.** Nothing imports it, and it still
  expects the old synchronous `explanation` field.
- **`ml/hdfs_sample.log`** (10 lines, yields 0 anomalies) could be deleted or replaced by
  `ml/hdfs_test_sample.log` to avoid confusion.
- **Model weights exist in two places** (`ml/saved_models/lstm_log_model.pth` and
  `backend/lstm_log_model.pth`). After any retraining, copy the new checkpoint *and*
  `ml/data/event_templates.json` into `backend/`, or have `train.py` write there directly.
