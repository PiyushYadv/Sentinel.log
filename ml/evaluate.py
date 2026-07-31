import json
import torch
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix

from model import LogAnomalyLSTM
from data_loader import get_dataloaders

# -----------------------------
# Hyperparameters
# -----------------------------
WINDOW_SIZE = 10
BATCH_SIZE = 64

INPUT_SIZE = 128
HIDDEN_SIZE = 128
NUM_LAYERS = 2

TOP_K = 4


# def evaluate_windows(model, dataloader, device, top_k=9):

    # model.eval()

    # block_predictions = {}

    # with torch.no_grad():

    #     for inputs, targets, block_ids in dataloader:

    #         inputs = inputs.to(device)
    #         targets = targets.to(device)

    #         outputs = model(inputs)

    #         k = min(top_k, outputs.size(1))

    #         _, topk = torch.topk(outputs, k, dim=1)

    #         for i in range(len(block_ids)):

    #             block = block_ids[i]

    #             normal = (topk[i] == targets[i]).any().item()

    #             if block not in block_predictions:
    #                 block_predictions[block] = False

    #             if not normal:
    #                 block_predictions[block] = True

    # return block_predictions

from collections import defaultdict

def evaluate_windows(
    model,
    dataloader,
    device,
    top_k=5,
    rule="any",
    min_windows=2,
    percentage=0.05,
):
    """
    rule:
        "any"        -> Original DeepLog (1 anomalous window)
        "count"      -> At least min_windows anomalous windows
        "percentage" -> At least percentage of windows anomalous
    """

    model.eval()

    total_windows = defaultdict(int)
    anomaly_windows = defaultdict(int)

    with torch.no_grad():

        for inputs, targets, block_ids in dataloader:

            inputs = inputs.to(device)
            targets = targets.to(device)

            outputs = model(inputs)

            k = min(top_k, outputs.size(1))
            _, topk = torch.topk(outputs, k, dim=1)

            for i in range(len(block_ids)):

                block = block_ids[i]

                total_windows[block] += 1

                normal = (topk[i] == targets[i]).any().item()

                if not normal:
                    anomaly_windows[block] += 1

    block_predictions = {}

    for block in total_windows:

        total = total_windows[block]
        anomalous = anomaly_windows[block]

        if rule == "any":
            block_predictions[block] = anomalous >= 1

        elif rule == "count":
            block_predictions[block] = anomalous >= min_windows

        elif rule == "percentage":
            block_predictions[block] = (anomalous / total) >= percentage

        else:
            raise ValueError("Unknown rule")

    return block_predictions

def evaluate_blocks(block_predictions, label_file="anomaly_label.csv"):

    labels = pd.read_csv(label_file)

    ground_truth = {}

    for _, row in labels.iterrows():

        ground_truth[row["BlockId"]] = (
            1 if str(row["Label"]).strip().lower() == "anomaly" else 0
        )

    y_true = []
    y_pred = []

    for block, pred in block_predictions.items():

        if block not in ground_truth:
            continue

        y_true.append(ground_truth[block])
        y_pred.append(1 if pred else 0)

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

    print("\n========== Evaluation ==========")
    print(f"Total Blocks           : {len(y_true)}")
    print(f"Ground Truth Anomalies : {sum(y_true)}")
    print(f"Predicted Anomalies    : {sum(y_pred)}")
    print()
    print(f"TP = {tp}")
    print(f"FP = {fp}")
    print(f"TN = {tn}")
    print(f"FN = {fn}")
    print()
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1 Score  : {f1:.4f}")


def main():

    with open("data/sequences.json") as f:
        sessions = json.load(f)

    (
        train_loader,
        test_loader,
        train_sessions,
        test_sessions,
        event2id,
        id2event,
    ) = get_dataloaders(
        sessions,
        window_size=WINDOW_SIZE,
        batch_size=BATCH_SIZE,
    )

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )

    model = LogAnomalyLSTM(
        num_classes=len(event2id),
        input_size=INPUT_SIZE,
        hidden_size=HIDDEN_SIZE,
        num_layers=NUM_LAYERS,
    ).to(device)

    checkpoint = torch.load(
      "saved_models/lstm_log_model.pth",
      map_location=device,
    )

    model.load_state_dict(
      checkpoint["model_state_dict"]
    )

    model.eval()

    # block_predictions = evaluate_windows(
    #     model,
    #     test_loader,
    #     device,
    #     TOP_K,
    # )

    # evaluate_blocks(block_predictions)

    tests = [
        ("Original", dict(rule="any")),
        ("2 windows", dict(rule="count", min_windows=2)),
        ("3 windows", dict(rule="count", min_windows=3)),
        ("5%", dict(rule="percentage", percentage=0.05)),
        ("10%", dict(rule="percentage", percentage=0.10)),
    ]

    for name, params in tests:

        print(f"\n===== {name} =====")

        block_predictions = evaluate_windows(
            model,
            test_loader,
            device,
            top_k=TOP_K,
            **params,
        )

        evaluate_blocks(block_predictions)


if __name__ == "__main__":
    main()


# ===== Original ======
# Training normal blocks : 446578
# Testing normal blocks  : 111645
# Testing anomaly blocks : 16838
# Missing events: ['E14', 'E15', 'E16', 'E18', 'E19', 'E20', 'E22', 'E23', 'E24', 'E25', 'E27', 'E28', 'E29', 'E30', 'E31', 'E32', 'E33', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45', 'E46', 'E47', 'E48', 'E49', 'E50', 'E51', 'E52', 'E53']
# Count: 33
# Unknown events count: 0
# Skipped short sessions: 0
# Unknown events count: 0
# Skipped short sessions: 6191
# Training blocks : 446578
# Testing blocks  : 128483
# Training samples: 4242792
# Testing samples : 1225239
# Vocabulary size : 54

# ===== Original =====

# ========== Evaluation ==========
# Total Blocks           : 122292
# Ground Truth Anomalies : 10647
# Predicted Anomalies    : 9689

# TP = 9327
# FP = 362
# TN = 111283
# FN = 1320

# Precision : 0.9626
# Recall    : 0.8760
# F1 Score  : 0.9173