---
title: Sentinel.log
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
short_description: LSTM log anomaly detection with Gemini diagnostics
---

# Sentinel.log

Upload a server log (HDFS format works best) and Sentinel.log mines Drain3 templates, runs a
PyTorch LSTM next-event model over sliding windows, and flags sequences whose next event falls
outside the model's top-4 predictions. Click a flagged sequence to get a plain-English Gemini
diagnostic.

Source code: https://github.com/piyushyadv/sentinel.log

This Space is deployed automatically from the GitHub repository by
`.github/workflows/deploy-huggingface.yml`.
