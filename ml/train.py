import os
import json

import torch
import torch.nn as nn
import torch.optim as optim

from sklearn.metrics import precision_score, recall_score, f1_score
import pandas as pd

from model import LogAnomalyLSTM
from data_loader import get_dataloaders

# -----------------------------
# Hyperparameters
# -----------------------------
WINDOW_SIZE = 10
BATCH_SIZE = 64
NUM_EPOCHS = 50
LEARNING_RATE = 5e-4

INPUT_SIZE = 128
HIDDEN_SIZE = 128
NUM_LAYERS = 2

TOP_K = 4


def train_one_epoch(
    model,
    dataloader,
    criterion,
    optimizer,
    device,
):

    model.train()

    running_loss = 0.0

    for inputs, targets, _ in dataloader:

        inputs = inputs.to(device)
        targets = targets.to(device)

        outputs = model(inputs)

        loss = criterion(outputs, targets)

        optimizer.zero_grad()

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=1.0
        )

        optimizer.step()

        running_loss += loss.item()

    return running_loss / len(dataloader)


def evaluate_windows(
    model,
    dataloader,
    device,
    top_k=9,
):
    """
    Returns:
        {
            block_id: True  -> anomaly
            block_id: False -> normal
        }
    """

    model.eval()

    block_predictions = {}

    with torch.no_grad():

        for inputs, targets, block_ids in dataloader:

            inputs = inputs.to(device)
            targets = targets.to(device)

            outputs = model(inputs)

            k = min(top_k, outputs.size(1))

            _, topk = torch.topk(
                outputs,
                k,
                dim=1
            )

            for i in range(len(block_ids)):

                block = block_ids[i]

                target = targets[i]

                normal = (
                    topk[i] == target
                ).any().item()

                if block not in block_predictions:
                    block_predictions[block] = False

                # DeepLog rule:
                # Any anomalous window makes the block anomalous
                if not normal:
                    block_predictions[block] = True

    return block_predictions


def evaluate_blocks(block_predictions, label_file="anomaly_label.csv"):
    """
    Compare predicted block labels with HDFS ground truth.
    """

    labels = pd.read_csv(label_file)

    # Convert labels to dictionary
    ground_truth = {}

    for _, row in labels.iterrows():

        block = row["BlockId"]

        label = str(row["Label"]).strip().lower()

        ground_truth[block] = (
            1
            if label == "anomaly"
            else 0
        )

    y_true = []
    y_pred = []

    for block, pred in block_predictions.items():

        if block not in ground_truth:
            continue

        y_true.append(
            ground_truth[block]
        )

        y_pred.append(
            1 if pred else 0
        )

    precision = precision_score(
        y_true,
        y_pred,
        zero_division=0
    )

    recall = recall_score(
        y_true,
        y_pred,
        zero_division=0
    )

    f1 = f1_score(
        y_true,
        y_pred,
        zero_division=0
    )

    return precision, recall, f1


def train():

    sequence_file = "data/sequences.json"

    if not os.path.exists(sequence_file):

        print("Run parser.py first.")
        return

    with open(sequence_file) as f:
        sessions = json.load(f)

    (
    train_loader,
    test_loader,
    train_sessions,
    test_sessions,
    event2id,
    id2event
    ) = get_dataloaders(
        sessions,
        window_size=WINDOW_SIZE,
        batch_size=BATCH_SIZE,
    )

    num_classes = len(event2id)

    print("Vocabulary:", num_classes)

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )

    print("Device:", device)

    model = LogAnomalyLSTM(
        num_classes=num_classes,
        input_size=INPUT_SIZE,
        hidden_size=HIDDEN_SIZE,
        num_layers=NUM_LAYERS,
    ).to(device)

    criterion = nn.CrossEntropyLoss()

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=1e-5,
    )

    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="min",
        factor=0.5,
        patience=3,
    )

    os.makedirs(
        "saved_models",
        exist_ok=True,
    )

    best_f1 = 0

    for epoch in range(NUM_EPOCHS):

        loss = train_one_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
            device,
        )

        scheduler.step(loss)

        block_predictions = evaluate_windows(
            model,
            test_loader,
            device,
            TOP_K,
        )

        precision, recall, f1 = evaluate_blocks(
            block_predictions,
            "anomaly_label.csv",
        )

        if f1 > best_f1:

            best_f1 = f1

            torch.save(
            {
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "event2id": event2id,
                "id2event": id2event,
            },
            "saved_models/lstm_log_model.pth",
)

        print(
			f"Epoch {epoch+1:02}/{NUM_EPOCHS} | "
			f"Loss {loss:.4f} | "
			f"Precision {precision:.4f} | "
			f"Recall {recall:.4f} | "
			f"F1 {f1:.4f}"
		)

    print()

    print(
		"Best F1:",
		round(best_f1 * 100, 2),
		"%"
	)

    print(
		"Model saved to saved_models/lstm_log_model.pth"
	)


if __name__ == "__main__":
    train()