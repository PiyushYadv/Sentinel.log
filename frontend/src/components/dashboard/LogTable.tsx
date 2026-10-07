"use client";

import { ThreatBadge } from "@/components/shared/ThreatBadge";
import { LogEntry } from "@/lib/types";
import { AlertTriangle, Clock, Hash, Terminal } from "lucide-react";

export function LogTable({
  data,
  selectedLog,
  onSelectLog,
}: {
  data: LogEntry[];
  selectedLog: LogEntry | null;
  onSelectLog: (log: LogEntry) => void;
}) {
  // Bonus: Make the CSV Export button actually work!
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    // Define the CSV headers
    const headers = [
      "Timestamp",
      "Sequence ID",
      "Threat Level",
      "Service",
      "Anomaly Score",
      "Log Preview",
    ];

    // Map the JSON data into comma-separated rows
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.timestamp,
          row.sequenceId,
          row.threatLevel,
          row.affectedService,
          row.anomalyScore,
          // Wrap the log preview in quotes and escape internal quotes to prevent CSV breaking
          `"${row.logPreview.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];

    // Trigger the browser download
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute(
      "download",
      `sentinel-anomalies-${new Date().getTime()}.csv`,
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Flagged Sequences
          </h2>
          <p className="text-xs text-[#6b7fa0] mt-0.5 font-mono">
            Click any row to inspect with AI analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Dynamically count the anomalies */}
          <span className="text-xs font-mono text-[#6b7fa0]">
            {data.length} results
          </span>
          <div className="w-px h-4 bg-border" />

          <button
            onClick={handleExportCSV}
            className="text-xs font-mono text-[#00d4f5] hover:text-[#00bfdf] transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[200px_140px_110px_1fr] text-[11px] font-mono text-[#6b7fa0] tracking-wider uppercase px-5 py-2.5 border-b border-border bg-[#07090d]/40">
        <div className="flex items-center gap-1.5">
          <Clock size={10} />
          Timestamp
        </div>
        <div className="flex items-center gap-1.5">
          <Hash size={10} />
          Sequence ID
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={10} />
          Threat
        </div>
        <div className="flex items-center gap-1.5">
          <Terminal size={10} />
          Raw Log Preview
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
        {data.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-[#6b7fa0] font-mono">
            No anomalies detected in the current window.
          </div>
        ) : (
          data.map((entry: LogEntry) => (
            <button
              key={entry.id}
              onClick={() => onSelectLog(entry)}
              className={`
                        w-full grid grid-cols-[200px_140px_110px_1fr] px-5 py-3.5 text-left
                        border-b border-border last:border-b-0 transition-all duration-150
                        ${selectedLog?.id === entry.id ? "bg-[#00d4f5]/5 border-l-2 border-l-[#00d4f5]" : "hover:bg-white/2"}
                        ${entry.threatLevel === "HIGH" && selectedLog?.id !== entry.id ? "hover:bg-[#ff3b4e]/5" : ""}
                      `}
            >
              <span className="font-mono text-xs text-[#6b7fa0] self-center">
                {entry.timestamp}
              </span>
              <span className="font-mono text-xs text-[#00d4f5] self-center truncate pr-2">
                {entry.sequenceId}
              </span>
              <span className="self-center">
                <ThreatBadge level={entry.threatLevel} />
              </span>
              <span className="font-mono text-xs text-[#6b7fa0] self-center truncate pr-4">
                {entry.logPreview}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
