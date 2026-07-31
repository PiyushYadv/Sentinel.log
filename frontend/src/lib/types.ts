export type Page = "home" | "processing" | "dashboard";
export type ThreatLevel = "HIGH" | "MEDIUM" | "LOW";

export interface LogEntry {
  id: string;
  timestamp: string;
  sequenceId: string;
  threatLevel: ThreatLevel;
  logPreview: string;
  anomalyScore: number;
  eventChain: string[];
  explanation: string;
  modelConfidence: number;
  affectedService: string;
}
