import datetime
import json
import os
import re
import time
from collections import defaultdict
from pathlib import Path

import torch
import torch.nn as nn
from dotenv import load_dotenv
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# gemini-2.0-flash has been retired (404); the alias tracks the current Flash model
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
GEMINI_TIMEOUT_MS = 20_000

# HDFS: "081109 203521 145 INFO dfs.DataNode$DataXceiver: message"
HDFS_PATTERN = re.compile(r"^(\d{6})\s+(\d{6})\s+\d+\s+[A-Z]+\s+([^\s:]+):\s+(.*)$")
# ISO-ish: "2026-10-08 12:34:56[,.]123 LEVEL service: message" (level/service optional)
ISO_PATTERN = re.compile(
    r"^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s+(.*)$"
)
# Syslog: "Oct  8 12:34:56 host service[123]: message"
SYSLOG_PATTERN = re.compile(
    r"^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+\S+\s+([^\s:\[]+)(?:\[\d+\])?:\s+(.*)$"
)
LEVEL_SERVICE_PATTERN = re.compile(r"^(?:\[?[A-Z]+\]?\s+)?([\w.$-]+):\s+(.*)$")
BLOCK_PATTERN = re.compile(r"(blk_-?\d+)")


def parse_line(line):
    """Split a raw log line into (timestamp, service, message). Timestamp may be None."""
    m = HDFS_PATTERN.match(line)
    if m:
        try:
            ts = datetime.datetime.strptime(m.group(1) + m.group(2), "%y%m%d%H%M%S")
        except ValueError:
            ts = None
        return ts, m.group(3), m.group(4)

    m = ISO_PATTERN.match(line)
    if m:
        try:
            ts = datetime.datetime.strptime(f"{m.group(1)} {m.group(2)}", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = None
        rest = m.group(3)
        ls = LEVEL_SERVICE_PATTERN.match(rest)
        if ls:
            return ts, ls.group(1), ls.group(2)
        return ts, "unknown", rest

    m = SYSLOG_PATTERN.match(line)
    if m:
        try:
            ts = datetime.datetime.strptime(
                f"{datetime.date.today().year} {m.group(1)} {m.group(2)} {m.group(3)}",
                "%Y %b %d %H:%M:%S",
            )
        except ValueError:
            ts = None
        return ts, m.group(4), m.group(5)

    return None, "unknown", line


class LogAnomalyLSTM(nn.Module):
    def __init__(self, num_classes, input_size, hidden_size, num_layers):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.embedding = nn.Embedding(num_embeddings=num_classes, embedding_dim=input_size)

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0,
        )

        self.dropout = nn.Dropout(0.1)
        self.fc = nn.Linear(hidden_size, num_classes)
        self._init_weights()

    def _init_weights(self):
        nn.init.xavier_uniform_(self.embedding.weight)
        nn.init.xavier_uniform_(self.fc.weight)
        nn.init.zeros_(self.fc.bias)

    def forward(self, x):
        x = self.embedding(x)
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        out = self.dropout(out)
        out = self.fc(out)
        return out


class LogAnalysisPipeline:
    TOP_K = 4

    def __init__(self):
        self.window_size = 10

        checkpoint = torch.load(BASE_DIR / "lstm_log_model.pth", map_location="cpu")
        self.event_to_int = checkpoint["event2id"]
        self.id_to_event = checkpoint["id2event"]
        self.unk_id = self.event_to_int.get("<UNK>", 0)

        with open(BASE_DIR / "event_templates.json") as f:
            self.template_to_event = json.load(f)
        # Reverse lookup so expected events are shown as readable templates, not "E5"
        self.event_to_template = {e: t for t, e in self.template_to_event.items()}

        self.model = LogAnomalyLSTM(
            num_classes=len(self.event_to_int),
            input_size=128,
            hidden_size=128,
            num_layers=2,
        )
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        self.drain_config = TemplateMinerConfig()
        self.drain_config.load(str(BASE_DIR / "drain3.ini"))
        self.drain_config.profiling_enabled = False

        self.client = None
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                from google.genai import types

                # Without a timeout a stalled request hangs the explain call indefinitely
                self.client = genai.Client(
                    api_key=api_key,
                    http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
                )
            except Exception as e:
                print(f"Gemini client unavailable, using offline explanations: {e}")

    @property
    def vocab_size(self):
        return len(self.event_to_int)

    def _event_label(self, idx):
        event = self.id_to_event.get(idx, f"ID-{idx}")
        return self.event_to_template.get(event, event)

    @staticmethod
    def _offline_explanation(event_chain, actual_event, expected_events, reason):
        expected = "; ".join(expected_events[:3]) or "a known transition"
        return (
            f"[Offline explanation — {reason}] The LSTM expected the sequence to continue with "
            f"one of: {expected}, but observed \"{actual_event}\" after {len(event_chain)} prior "
            f"events. This transition is outside the top-{LogAnalysisPipeline.TOP_K} learned "
            f"execution paths, which typically indicates an interrupted write pipeline, a failed "
            f"replica/verification step, or an unexpected retry. Inspect the affected node's "
            f"logs around this block and confirm replication health."
        )

    def generate_explanation(self, event_chain, actual_event, expected_events):
        if self.client is None:
            return self._offline_explanation(
                event_chain, actual_event, expected_events, "GEMINI_API_KEY not configured"
            )

        prompt = f"""
        You are a senior Site Reliability Engineer.

        Observed event sequence:
        {" -> ".join(event_chain)}

        Actual next event:
        {actual_event}

        Expected next events predicted by the LSTM:
        {", ".join(expected_events)}

        Explain:
        1. Why this sequence is anomalous.
        2. Possible root cause.
        3. Suggested remediation.

        Limit to 3 concise sentences.
        """

        from google.genai import errors, types

        config = types.GenerateContentConfig(
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )
        for attempt in range(2):
            try:
                response = self.client.models.generate_content(
                    model=GEMINI_MODEL, contents=prompt, config=config
                )
                return response.text.strip()
            except errors.ServerError as e:
                print(f"Gemini Error (attempt {attempt + 1}): {e}")
                # 503 "high demand" is usually transient: retry once. A 504 means our
                # timeout already elapsed, so retrying would just double the wait.
                if e.code != 503:
                    break
                time.sleep(1.5)
            except Exception as e:
                print(f"Gemini Error: {e}")
                break

        return self._offline_explanation(
            event_chain, actual_event, expected_events, "Gemini request failed"
        )

    def _map_template(self, template):
        event_name = self.template_to_event.get(template)
        if event_name is None:
            return self.unk_id
        return self.event_to_int.get(event_name, self.unk_id)

    def process_logs(self, log_lines):
        # Fresh miner per request: results are deterministic and requests stay thread-safe
        miner = TemplateMiner(config=self.drain_config)

        parsed = []
        for line in log_lines:
            line = line.strip()
            if not line:
                continue
            ts, service, message = parse_line(line)
            block_match = BLOCK_PATTERN.search(line)
            parsed.append(
                (block_match.group(1) if block_match else None, ts, service, message, line)
            )

        # HDFS logs are sessionized by BlockId (matching training); anything else
        # falls back to sliding windows over the whole stream.
        has_blocks = any(block_id for block_id, *_ in parsed)

        sessions = defaultdict(list)
        for block_id, ts, service, message, raw in parsed:
            if has_blocks and block_id is None:
                continue  # Skip logs that don't belong to a block, matching training behavior
            template = miner.add_log_message(message)["template_mined"]
            session_key = block_id if has_blocks else "STREAM"
            sessions[session_key].append(
                (self._map_template(template), template, service, ts, raw)
            )

        # Build every window up front and run one batched forward pass
        windows, targets, meta = [], [], []
        for session_key, events in sessions.items():
            ids = [e[0] for e in events]
            for i in range(len(ids) - self.window_size):
                windows.append(ids[i : i + self.window_size])
                targets.append(ids[i + self.window_size])
                meta.append((session_key, i))

        if not windows:
            return []

        with torch.no_grad():
            probabilities = torch.softmax(self.model(torch.tensor(windows, dtype=torch.long)), dim=1)
            top_probs, top_indices = torch.topk(probabilities, self.TOP_K, dim=1)

        results = []
        for row, (actual, (session_key, i)) in enumerate(zip(targets, meta)):
            row_top = top_indices[row].tolist()
            if actual in row_top:
                continue

            events = sessions[session_key]
            actual_prob = probabilities[row, actual].item()
            score = 1.0 - actual_prob
            # How sure the model is about what *should* have happened instead
            confidence = top_probs[row, 0].item()

            if score > 0.99:
                level = "HIGH"
            elif score > 0.95:
                level = "MEDIUM"
            else:
                level = "LOW"

            chain = events[i : i + self.window_size + 1]
            actual_event = chain[-1]
            results.append({
                "sequenceId": f"{session_key}-SEQ-{i}",
                "timestamp": actual_event[3],
                "affectedService": actual_event[2],
                # Raw lines are what the user uploaded; templates feed the model and the LLM
                "logPreview": actual_event[4],
                "rawEventChain": [e[4] for e in chain],
                "eventChain": [e[1] for e in chain],
                "actualEvent": actual_event[1],
                "expectedEvents": [self._event_label(idx) for idx in row_top],
                "anomalyScore": round(score, 4),
                "confidence": round(confidence, 4),
                "threatLevel": level,
                "explanation": None,
            })

        results.sort(key=lambda x: x["anomalyScore"], reverse=True)
        return results
