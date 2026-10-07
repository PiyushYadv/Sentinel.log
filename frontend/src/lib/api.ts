"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logEntries as mockLogEntries } from "@/lib/mockData";
import { LogEntry } from "@/lib/types";

export const ANOMALIES_QUERY_KEY = ["log_anomalies"] as const;
const STORAGE_KEY = "sentinel.analysis";

export interface AnalysisResult {
  anomalies: LogEntry[];
  source: "upload" | "demo";
  fileName?: string;
  linesProcessed?: number;
}

// ── Session persistence ─────────────────────────────────────────────────────

function loadPersistedAnalysis(): AnalysisResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}

function persistAnalysis(result: AnalysisResult) {
  if (result.source !== "upload") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Storage full or blocked — the in-memory cache still works
  }
}

async function postJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed with status ${res.status}`);
  }
  return data as T;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

// Last analysis from the cache, else sessionStorage (survives refresh), else demo data
export function useAnomalies() {
  return useQuery({
    queryKey: ANOMALIES_QUERY_KEY,
    queryFn: (): AnalysisResult =>
      loadPersistedAnalysis() ?? { anomalies: mockLogEntries, source: "demo" },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useAnalyzeLogs({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      // Call our Next.js proxy, NOT FastAPI directly
      return postJson<{
        anomalies: LogEntry[];
        fileName?: string;
        linesProcessed?: number;
      }>("/api/analyze", { method: "POST", body: formData });
    },
    onSuccess: (data, file) => {
      const result: AnalysisResult = {
        anomalies: data.anomalies,
        source: "upload",
        fileName: data.fileName ?? file.name,
        linesProcessed: data.linesProcessed,
      };
      queryClient.setQueryData(ANOMALIES_QUERY_KEY, result);
      persistAnalysis(result);
      onSuccess?.();
    },
  });
}

export function useExplainAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (log: LogEntry) => {
      const chain = log.eventChain;
      return postJson<{ sequenceId: string; explanation: string }>(
        "/api/explain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sequenceId: log.sequenceId,
            eventChain: chain.slice(0, -1),
            actualEvent: log.actualEvent ?? chain[chain.length - 1] ?? "",
            expectedEvents: log.expectedEvents ?? [],
            affectedService: log.affectedService,
          }),
        },
      );
    },
    onSuccess: ({ explanation }, log) => {
      const updated = queryClient.setQueryData<AnalysisResult>(
        ANOMALIES_QUERY_KEY,
        (prev) =>
          prev && {
            ...prev,
            anomalies: prev.anomalies.map((a) =>
              a.id === log.id ? { ...a, explanation } : a,
            ),
          },
      );
      if (updated) persistAnalysis(updated);
    },
  });
}
