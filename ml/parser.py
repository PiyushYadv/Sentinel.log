import os
import re
import json
from collections import defaultdict

from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

BLOCK_REGEX = re.compile(r"(blk_-?\d+)")

def parse_logs(log_file_path):

    config = TemplateMinerConfig()
    config.load("drain3.ini")

    miner = TemplateMiner(config=config)

    # block_id -> sequence of Event IDs
    sessions = defaultdict(list)

    # template -> Event ID
    template_to_event = {}
    event_counter = 1

    print(f"Parsing {log_file_path}...")

    with open(log_file_path, "r", encoding="utf-8", errors="ignore") as f:

        for line in f:
            line = line.strip()

            if not line:
                continue

            parts = line.split(" ", 5)

            if len(parts) < 6:
                continue

            content = parts[5]

            result = miner.add_log_message(content)

            template = result["template_mined"]

            # Assign Event ID
            if template not in template_to_event:
                template_to_event[template] = f"E{event_counter}"
                event_counter += 1

            event_id = template_to_event[template]

            # Extract block ID
            match = BLOCK_REGEX.search(line)
            if match is None:
                continue

            block_id = match.group(1)

            sessions[block_id].append(event_id)

    os.makedirs("data", exist_ok=True)

    with open("data/sequences.json", "w") as f:
        json.dump(sessions, f, indent=4)

    with open("data/event_templates.json", "w") as f:
        json.dump(template_to_event, f, indent=4)

    print(f"Unique templates : {len(template_to_event)}")
    print(f"Blocks           : {len(sessions)}")
    print(f"Events           : {sum(len(v) for v in sessions.values())}")

    lengths = [len(seq) for seq in sessions.values()]

    print("Min:", min(lengths))
    print("Max:", max(lengths))
    print("Average:", sum(lengths) / len(lengths))

    for t in [5, 10, 15, 20, 30]:
        count = sum(1 for l in lengths if l > t)
        print(f"Blocks with length > {t}: {count}")

    return sessions, miner


if __name__ == "__main__":
    parse_logs("HDFS.log")