import { LogEntry } from "./types";

export const chartData = [
  { time: "00:00", anomalies: 2 },
  { time: "01:00", anomalies: 1 },
  { time: "02:00", anomalies: 3 },
  { time: "03:00", anomalies: 1 },
  { time: "04:00", anomalies: 0 },
  { time: "05:00", anomalies: 2 },
  { time: "06:00", anomalies: 5 },
  { time: "07:00", anomalies: 8 },
  { time: "08:00", anomalies: 4 },
  { time: "09:00", anomalies: 12 },
  { time: "10:00", anomalies: 7 },
  { time: "11:00", anomalies: 19 },
  { time: "12:00", anomalies: 6 },
  { time: "13:00", anomalies: 3 },
  { time: "14:00", anomalies: 9 },
  { time: "15:00", anomalies: 24 },
  { time: "16:00", anomalies: 11 },
  { time: "17:00", anomalies: 6 },
  { time: "18:00", anomalies: 14 },
  { time: "19:00", anomalies: 3 },
  { time: "20:00", anomalies: 7 },
  { time: "21:00", anomalies: 2 },
  { time: "22:00", anomalies: 5 },
  { time: "23:00", anomalies: 1 },
];

export const logEntries: LogEntry[] = [
  {
    id: "1",
    timestamp: "2025-07-24 11:47:03.812",
    sequenceId: "SEQ-8821-A",
    threatLevel: "HIGH",
    logPreview:
      "[auth] LOGIN user=root ip=185.220.101.47 | [db] EXEC DROP TABLE users | [sys] SUDO rm -rf /var",
    anomalyScore: 0.974,
    eventChain: [
      "Login (root)",
      "DB Execute",
      "DROP TABLE users",
      "SUDO rm -rf",
    ],
    explanation:
      "The LSTM model detected a statistically improbable sequence transition from authenticated root login to a destructive DDL statement within 340ms, followed immediately by a system-level deletion command. This 4-event chain has a log-likelihood of -14.3 under the trained baseline distribution. The IP 185.220.101.47 is a known Tor exit node. This sequence pattern matches 94% similarity to the credential-and-destroy lateral movement technique documented in MITRE ATT&CK T1485.",
    modelConfidence: 0.97,
    affectedService: "auth-gateway / postgres-primary",
  },
  {
    id: "2",
    timestamp: "2025-07-24 11:32:18.229",
    sequenceId: "SEQ-8819-C",
    threatLevel: "HIGH",
    logPreview:
      "[api] POST /admin/export?token=Bearer eyJhb... | [s3] PutObject bucket=prod-backups/exfil | [net] OUT 2.4GB",
    anomalyScore: 0.931,
    eventChain: [
      "API /admin/export",
      "S3 PutObject (exfil)",
      "Network Egress 2.4GB",
    ],
    explanation:
      "An authenticated API call to the admin export endpoint was followed by an anomalously large S3 write to an unrecognized bucket path suffix. Network egress of 2.4GB occurred within 90 seconds — a 47× deviation from the 99th percentile baseline of 51MB for this endpoint. The bearer token was issued 18 seconds before the request, suggesting automated credential use.",
    modelConfidence: 0.93,
    affectedService: "api-server-03 / s3-prod",
  },
  {
    id: "3",
    timestamp: "2025-07-24 10:58:44.001",
    sequenceId: "SEQ-8817-B",
    threatLevel: "MEDIUM",
    logPreview:
      "[cron] SPAWN python3 miner.py --pool xmr.pool.io | [sys] CPU usage=98% cores=all | [net] OUT persistent",
    anomalyScore: 0.761,
    eventChain: [
      "Cron spawn",
      "python3 miner.py",
      "CPU saturation",
      "Persistent outbound",
    ],
    explanation:
      "A cron-spawned Python process with a mining pool hostname argument saturated all CPU cores. The cron invocation followed by an outbound persistent connection deviates from the observed baseline. The model places this sequence in the top 3% of anomalous cron activity over the past 30 days.",
    modelConfidence: 0.76,
    affectedService: "worker-node-07",
  },
  {
    id: "4",
    timestamp: "2025-07-24 10:41:09.557",
    sequenceId: "SEQ-8814-A",
    threatLevel: "MEDIUM",
    logPreview:
      "[ssh] CONNECT user=deploy key=ed25519-AAAA... | [git] clone https://github.com/unknown/backdoor | [bash] chmod +x",
    anomalyScore: 0.688,
    eventChain: [
      "SSH deploy key auth",
      "git clone (unknown repo)",
      "chmod +x payload",
    ],
    explanation:
      "SSH access via a known deploy key followed by a git clone from an unregistered external repository and executable permission grant. The deploy key has never previously been observed cloning external repositories. The target repository URL was registered 11 hours ago.",
    modelConfidence: 0.69,
    affectedService: "ci-runner-02",
  },
  {
    id: "5",
    timestamp: "2025-07-24 09:55:30.344",
    sequenceId: "SEQ-8809-D",
    threatLevel: "MEDIUM",
    logPreview:
      "[iam] ASSUME_ROLE arn:aws:iam::prod:role/AdminAccess | [ec2] RunInstances type=p4d.24xlarge count=16",
    anomalyScore: 0.634,
    eventChain: [
      "IAM AssumeRole (AdminAccess)",
      "EC2 RunInstances (p4d.24xlarge ×16)",
    ],
    explanation:
      "An IAM role assumption for AdminAccess was immediately followed by a request to launch 16 GPU instances of the highest tier available. This action has no precedent in the account history. The request originated from a temporary session credential issued to a CI pipeline token.",
    modelConfidence: 0.63,
    affectedService: "aws-us-east-1 / iam",
  },
  {
    id: "6",
    timestamp: "2025-07-24 09:22:11.780",
    sequenceId: "SEQ-8805-B",
    threatLevel: "LOW",
    logPreview:
      "[auth] FAIL user=admin attempts=7 | [auth] FAIL user=administrator attempts=3 | [auth] FAIL user=root attempts=5",
    anomalyScore: 0.412,
    eventChain: [
      "Auth fail (admin)",
      "Auth fail (administrator)",
      "Auth fail (root)",
    ],
    explanation:
      "Sequential authentication failures across multiple common privileged usernames from a single source IP over 4 minutes. The pattern is consistent with automated credential stuffing but no successful authentication followed.",
    modelConfidence: 0.41,
    affectedService: "auth-gateway",
  },
  {
    id: "7",
    timestamp: "2025-07-24 08:47:59.123",
    sequenceId: "SEQ-8801-A",
    threatLevel: "LOW",
    logPreview:
      "[k8s] kubectl exec pod/api-prod-78c -- /bin/bash | [env] printenv | POSTGRES_PASSWORD=***",
    anomalyScore: 0.389,
    eventChain: ["kubectl exec (bash)", "printenv", "Secret exposure"],
    explanation:
      "An interactive bash shell was spawned inside a production pod followed by a printenv invocation. This is a policy violation — the user was an authenticated engineer. The model notes that printenv in a production exec session has occurred only twice in 90 days.",
    modelConfidence: 0.39,
    affectedService: "k8s-prod / api-prod",
  },
];
