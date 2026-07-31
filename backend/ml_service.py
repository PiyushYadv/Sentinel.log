import torch
import torch.nn as nn
import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class LogAnomalyLSTM(nn.Module):
  def __init__(self, num_classes, input_size, hidden_size, num_layers):
    super().__init__()

    self.hidden_size = hidden_size
    self.num_layers = num_layers

    # Embedding layer
    self.embedding = nn.Embedding(
      num_embeddings=num_classes,
      embedding_dim=input_size,
    )

    # LSTM with dropout (dropout only works if num_layers > 1)
    self.lstm = nn.LSTM(
      input_size=input_size,
      hidden_size=hidden_size,
      num_layers=num_layers,
      batch_first=True,
      dropout=0.2,
    )

    # Dropout before classification
    self.dropout = nn.Dropout(0.1)

    # Classification layer
    self.fc = nn.Linear(hidden_size, num_classes)

    self._init_weights()


  def _init_weights(self):

    nn.init.xavier_uniform_(self.embedding.weight)

    nn.init.xavier_uniform_(self.fc.weight)

    nn.init.zeros_(self.fc.bias)

  def forward(self, x):
    # (batch_size, window_size)
    x = self.embedding(x)

    # (batch_size, window_size, hidden_size)
    out, _ = self.lstm(x)

    # Last timestep
    out = out[:, -1, :]

    # Regularization
    out = self.dropout(out)

    # Predict next template
    out = self.fc(out)

    return out

class LogAnalysisPipeline:

    TOP_K = 4

    def __init__(self):

        self.window_size = 10

        checkpoint = torch.load(
            "lstm_log_model.pth",
            map_location="cpu",
        )

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

        self.model.load_state_dict(
            checkpoint["model_state_dict"]
        )

        self.model.eval()

        config = TemplateMinerConfig()
        config.load("drain3.ini")
        config.profiling_enabled = False

        self.miner = TemplateMiner(config=config)

        self.gemini = genai.GenerativeModel(
            "gemini-3.5-flash"
        )

    def generate_explanation(
        self,
        event_chain,
        actual_event,
        expected_events,
    ):

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

            response = self.gemini.generate_content(prompt)

            return response.text.strip()

        except Exception:

            return "Unable to generate explanation."

    def process_logs(self, log_lines):

        results = []

        sequence_ids = []
        templates = []
        services = []

        log_pattern = re.compile(
            r'^\d{6}\s+\d{6}\s+\d+\s+[A-Z]+\s+([^\s:]+):\s+(.*)$'
        )

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

            result = self.miner.add_log_message(message)

            template = result["template_mined"]

            event_name = self.template_to_event.get(template)

            if event_name is None:
                # unseen template
                continue

            mapped_id = self.event_to_int[event_name]

            if mapped_id is None:
                continue

            sequence_ids.append(mapped_id)
            templates.append(template)
            services.append(service)

        if len(sequence_ids) <= self.window_size:
            return []

        with torch.no_grad():

            for i in range(
                len(sequence_ids) - self.window_size
            ):

                window = sequence_ids[
                    i:i+self.window_size
                ]

                actual = sequence_ids[
                    i+self.window_size
                ]

                x = torch.tensor(
                    [window],
                    dtype=torch.long,
                )

                logits = self.model(x)

                probabilities = torch.softmax(
                    logits,
                    dim=1,
                )

                top_probs, top_indices = torch.topk(
                    probabilities,
                    self.TOP_K,
                    dim=1,
                )

                top_indices = top_indices.squeeze(0)

                if actual in top_indices.tolist():
                    continue

                confidence = probabilities[
                    0,
                    actual
                ].item()

                expected_events = []

                for idx in top_indices.tolist():

                    expected_events.append(
                        self.id_to_event.get(
                            idx,
                            f"ID-{idx}",
                        )
                    )

                explanation = self.generate_explanation(
                    templates[
                        i:i+self.window_size
                    ],
                    templates[
                        i+self.window_size
                    ],
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

                    "sequenceId": f"SEQ-{i}",

                    "affectedService":
                        services[
                            i+self.window_size
                        ],

                    "logPreview":
                        templates[
                            i+self.window_size
                        ],

                    "eventChain":
                        templates[
                            i:i+self.window_size+1
                        ],

                    "actualEvent":
                        templates[
                            i+self.window_size
                        ],

                    "expectedEvents":
                        expected_events,

                    "anomalyScore":
                        round(score, 4),

                    "confidence":
                        round(confidence, 4),

                    "threatLevel":
                        level,

                    "explanation":
                        explanation,
                })

        results.sort(
            key=lambda x: x["anomalyScore"],
            reverse=True,
        )

        return results