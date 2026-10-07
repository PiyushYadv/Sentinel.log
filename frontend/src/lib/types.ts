export type Page = "home" | "processing" | "dashboard";
export type ThreatLevel = "HIGH" | "MEDIUM" | "LOW";

export interface LogEntry {
  id: string;
  timestamp: string;
  sequenceId: string;
  threatLevel: ThreatLevel;
  logPreview: string;
  anomalyScore: number;
  // Parsed Drain3 templates (fed to the model and the LLM)
  eventChain: string[];
  // The original uploaded log lines for the same window, in the same order
  rawEventChain?: string[];
  actualEvent?: string;
  expectedEvents?: string[];
  // null until the user requests an on-demand LLM diagnostic
  explanation: string | null;
  modelConfidence: number;
  affectedService: string;
}
