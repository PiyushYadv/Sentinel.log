"use client";

import { useState } from "react";
import { LogEntry } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { AnomalyChart } from "@/components/dashboard/AnomalyChart";
import { ConfusionMatrix } from "@/components/dashboard/ConfusionMatrix";
import { LogTable } from "@/components/dashboard/LogTable";
import { LLMSidebar } from "@/components/dashboard/LLMSidebar";
import { useAnomalies, useBackendWarmup } from "@/lib/api";

export default function DashboardPage() {
  // State is lifted here so the table can update the sidebar
  const [activeModel, setActiveModel] = useState<"LSTM" | "GRU">("LSTM");
  // Track by id so the sidebar re-renders with cache updates (e.g. a new explanation)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data } = useAnomalies();
  useBackendWarmup();
  const anomalies = data?.anomalies ?? [];
  const selectedLog = anomalies.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="dark min-h-screen bg-background text-foreground font-['Inter',sans-serif]">
      <DashboardHeader
        activeModel={activeModel}
        setActiveModel={setActiveModel}
      />

      <div className="pt-14 flex min-h-screen">
        <main
          className="flex-1 transition-all duration-300 overflow-x-hidden"
          style={{ marginRight: selectedLog ? 440 : 0 }}
        >
          <div className="max-w-300 mx-auto px-6 py-6 space-y-6">
            {data && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#6b7fa0]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${data.source === "upload" ? "bg-[#34d399]" : "bg-yellow-500/80"}`}
                />
                {data.source === "upload"
                  ? `ANALYZED · ${data.fileName ?? "uploaded file"}${data.linesProcessed ? ` · ${data.linesProcessed.toLocaleString()} lines` : ""}`
                  : "DEMO DATA · upload a log file to analyze your own logs"}
              </div>
            )}
            <MetricCards data={anomalies} />
            <AnomalyChart activeModel={activeModel} data={anomalies} />
            <ConfusionMatrix />
            <LogTable
              data={anomalies}
              selectedLog={selectedLog}
              onSelectLog={(log: LogEntry) =>
                setSelectedId(selectedId === log.id ? null : log.id)
              }
            />
          </div>
        </main>

        <LLMSidebar log={selectedLog} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}
