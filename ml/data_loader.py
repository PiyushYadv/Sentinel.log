import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split

import pandas as pd

labels = pd.read_csv("anomaly_label.csv")

ground_truth = {
    row["BlockId"]: row["Label"].strip().lower()
    for _, row in labels.iterrows()
}


class LogDataset(Dataset):
    def __init__(self, sessions, event2id, window_size):

        self.inputs = []
        self.targets = []
        self.block_ids = []

        self.event2id = event2id

        skipped = 0
        unknowns = 0

        for block_id, sequence in sessions.items():

            if len(sequence) <= window_size:
                skipped+=1
                continue

            sequence = [
                self.event2id.get(event, self.event2id["<UNK>"])
                for event in sequence
            ]

            for i in sequence:
                if i == self.event2id["<UNK>"]:
                    unknowns+=1

            if len(sequence) <= window_size:
                skipped+=1
                continue

            for i in range(len(sequence) - window_size):

                self.inputs.append(
                    sequence[i:i + window_size]
                )

                self.targets.append(
                    sequence[i + window_size]
                )

                # Save the BlockId for this window
                self.block_ids.append(block_id)

        print(f"Unknown events count: {unknowns}")
        print(f"Skipped short sessions: {skipped}")

    def __len__(self):
        return len(self.inputs)

    def __getitem__(self, idx):

        x = torch.tensor(
            self.inputs[idx],
            dtype=torch.long
        )

        y = torch.tensor(
            self.targets[idx],
            dtype=torch.long
        )

        block = self.block_ids[idx]

        return x, y, block


def split_sessions(
    sessions,
    test_size=0.2,
    random_state=42
):
    """
    Train on NORMAL blocks only.
    Test on remaining NORMAL + ALL ANOMALOUS blocks.
    """

    normal_blocks = [
        b for b in sessions
        if ground_truth.get(b) == "normal"
    ]

    anomaly_blocks = [
        b for b in sessions
        if ground_truth.get(b) == "anomaly"
    ]

    train_blocks, normal_test_blocks = train_test_split(
        normal_blocks,
        test_size=test_size,
        random_state=random_state,
        shuffle=True
    )

    test_blocks = normal_test_blocks + anomaly_blocks

    print(f"Training normal blocks : {len(train_blocks)}")
    print(f"Testing normal blocks  : {len(normal_test_blocks)}")
    print(f"Testing anomaly blocks : {len(anomaly_blocks)}")

    train_sessions = {
        b: sessions[b]
        for b in train_blocks
    }

    test_sessions = {
        b: sessions[b]
        for b in test_blocks
    }

    return train_sessions, test_sessions


def build_event_vocab(sessions):
    """
    Build vocabulary ONLY from training data.
    """

    unique_events = sorted(
        {
            event
            for sequence in sessions.values()
            for event in sequence
        }
    )

    event2id = {"<UNK>": 0}

    for event in unique_events:
        event2id[event] = len(event2id)

    id2event = {
        idx: event
        for event, idx in event2id.items()
    }

    return event2id, id2event


def get_dataloaders(
    sessions,
    window_size=10,
    batch_size=64,
    test_size=0.2,
):

    # -----------------------------
    # Step 4: Split by BlockId
    # -----------------------------
    train_sessions, test_sessions = split_sessions(
        sessions,
        test_size=test_size
    )

    # ===== DEBUG START =====
    all_events = {
        event
        for seq in sessions.values()
        for event in seq
    }

    train_events = {
        event
        for seq in train_sessions.values()
        for event in seq
    }

    missing = sorted(all_events - train_events)

    print("Missing events:", missing)
    print("Count:", len(missing))
    # ===== DEBUG END =====

    # -----------------------------
    # Build ONE shared vocabulary
    # -----------------------------
    event2id, id2event = build_event_vocab(sessions)

    # -----------------------------
    # Step 5: Sliding windows
    # -----------------------------
    train_dataset = LogDataset(
        train_sessions,
        event2id,
        window_size
    )

    test_dataset = LogDataset(
        test_sessions,
        event2id,
        window_size
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False
    )

    print(f"Training blocks : {len(train_sessions)}")
    print(f"Testing blocks  : {len(test_sessions)}")
    print(f"Training samples: {len(train_dataset)}")
    print(f"Testing samples : {len(test_dataset)}")
    print(f"Vocabulary size : {len(event2id)}")

    return (
        train_loader,
        test_loader,
        train_sessions,
        test_sessions,
        event2id,
        id2event
    )