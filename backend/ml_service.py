import torch
import torch.nn as nn
# import google.generativeai as genai
from google import genai
import os
import json
import re
from collections import defaultdict
from dotenv import load_dotenv
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

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

        checkpoint = torch.load("lstm_log_model.pth", map_location="cpu")
        self.event_to_int = checkpoint["event2id"]
        self.id_to_event = checkpoint["id2event"]

        with open("event_templates.json") as f:
            self.template_to_event = json.load(f)

        num_classes = len(self.event_to_int)

        self.model = LogAnomalyLSTM(
            num_classes=num_classes,
            input_size=128,
            hidden_size=128,
            num_layers=2,
        )
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        config = TemplateMinerConfig()
        config.load("drain3.ini")
        config.profiling_enabled = False
        self.miner = TemplateMiner(config=config)

        # Fixed: Updated to the correct Gemini model name
        # self.gemini = genai.GenerativeModel("gemini-1.5-flash")
        self.client = client

    def generate_explanation(self, event_chain, actual_event, expected_events):
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

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini Error: {e}")
            return "Unable to generate explanation."

    def process_logs(self, log_lines):
        results = []

        # Dictionaries to segregate sequences by BlockId
        sessions_ids = defaultdict(list)
        sessions_templates = defaultdict(list)
        sessions_services = defaultdict(list)

        log_pattern = re.compile(r'^\d{6}\s+\d{6}\s+\d+\s+[A-Z]+\s+([^\s:]+):\s+(.*)$')
        block_regex = re.compile(r"(blk_-?\d+)")

        # 1. Parse and segregate logs by BlockId
        for line in log_lines:
            if not line.strip():
                continue

            match = log_pattern.match(line.strip())
            if match:
                service = match.group(1)
                message = match.group(2)
            else:
                service = "unknown"
                message = line.strip()

            # Extract block ID using the exact logic from parser.py
            block_match = block_regex.search(line)
            if not block_match:
                continue # Skip logs that don't belong to a block, matching training behavior
            
            block_id = block_match.group(1)

            result = self.miner.add_log_message(message)
            template = result["template_mined"]
            event_name = self.template_to_event.get(template)

            # Fixed: Safely route unseen templates to the <UNK> token
            if event_name is None:
                mapped_id = self.event_to_int.get("<UNK>", 0)
            else:
                mapped_id = self.event_to_int.get(event_name, self.event_to_int.get("<UNK>", 0))

            sessions_ids[block_id].append(mapped_id)
            sessions_templates[block_id].append(template)
            sessions_services[block_id].append(service)

        # 2. Run inference independently per block
        with torch.no_grad():
            for block_id, sequence_ids in sessions_ids.items():
                if len(sequence_ids) <= self.window_size:
                    continue

                templates = sessions_templates[block_id]
                services = sessions_services[block_id]

                for i in range(len(sequence_ids) - self.window_size):
                    window = sequence_ids[i : i + self.window_size]
                    actual = sequence_ids[i + self.window_size]

                    x = torch.tensor([window], dtype=torch.long)
                    logits = self.model(x)
                    probabilities = torch.softmax(logits, dim=1)

                    top_probs, top_indices = torch.topk(probabilities, self.TOP_K, dim=1)
                    top_indices = top_indices.squeeze(0)

                    if actual in top_indices.tolist():
                        continue

                    confidence = probabilities[0, actual].item()

                    expected_events = []
                    for idx in top_indices.tolist():
                        expected_events.append(self.id_to_event.get(idx, f"ID-{idx}"))

                    explanation = self.generate_explanation(
                        templates[i : i + self.window_size],
                        templates[i + self.window_size],
                        expected_events,
                    )

                    score = 1.0 - confidence

                    if score > 0.99:
                        level = "HIGH"
                    elif score > 0.95:
                        level = "MEDIUM"
                    else:
                        level = "LOW"

                    results.append({
                        # Appending block_id to the sequence ID for UI traceability
                        "sequenceId": f"{block_id}-SEQ-{i}",
                        "affectedService": services[i + self.window_size],
                        "logPreview": templates[i + self.window_size],
                        "eventChain": templates[i : i + self.window_size + 1],
                        "actualEvent": templates[i + self.window_size],
                        "expectedEvents": expected_events,
                        "anomalyScore": round(score, 4),
                        "confidence": round(confidence, 4),
                        "threatLevel": level,
                        "explanation": explanation,
                    })

        results.sort(key=lambda x: x["anomalyScore"], reverse=True)
        return results