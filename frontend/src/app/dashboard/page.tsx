"use client";

import { useState } from "react";
import { LogEntry } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { AnomalyChart } from "@/components/dashboard/AnomalyChart";
import { LogTable } from "@/components/dashboard/LogTable";
import { LLMSidebar } from "@/components/dashboard/LLMSidebar";

export default function DashboardPage() {
  // State is lifted here so the table can update the sidebar
  const [activeModel, setActiveModel] = useState<"LSTM" | "GRU">("LSTM");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

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
            <MetricCards />
            <AnomalyChart activeModel={activeModel} />
            <LogTable
              selectedLog={selectedLog}
              onSelectLog={(log: LogEntry) =>
                setSelectedLog(selectedLog?.id === log.id ? null : log)
              }
            />
          </div>
        </main>

        <LLMSidebar log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  );
}
