import { ThreatBadge } from "@/components/shared/ThreatBadge";
import { LogEntry } from "@/lib/types";
import { AlertTriangle, Cpu, Eye, X } from "lucide-react";

export function LLMSidebar({
  log,
  onClose,
}: {
  log: LogEntry | null;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed top-14 right-0 bottom-0 w-110 bg-[#0a0f16] border-l border-border flex flex-col overflow-hidden transition-transform duration-300 ease-out z-40 ${log ? "translate-x-0" : "translate-x-full"}`}
    >
      {log && (
        <>
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-[#6b7fa0] tracking-widest uppercase">
                  AI Anomaly Report
                </span>
                <ThreatBadge level={log.threatLevel} />
              </div>
              <h3 className="text-base font-semibold text-foreground truncate">
                {log.sequenceId}
              </h3>
              <p className="text-xs font-mono text-[#6b7fa0] mt-0.5">
                {log.timestamp}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 w-7 h-7 flex items-center justify-center rounded border border-border hover:border-white/20 hover:bg-white/5 transition-all text-[#6b7fa0] hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1218] border border-border rounded-lg p-4">
                  <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase mb-2">
                    Anomaly Score
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-semibold tabular-nums ${log.anomalyScore > 0.85 ? "text-[#ff3b4e]" : log.anomalyScore > 0.6 ? "text-orange-400" : "text-yellow-500/80"}`}
                    >
                      {log.anomalyScore.toFixed(3)}
                    </span>
                    <span className="text-xs text-[#6b7fa0]">/ 1.000</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-[#111827] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${log.anomalyScore > 0.85 ? "bg-[#ff3b4e]" : log.anomalyScore > 0.6 ? "bg-orange-400" : "bg-yellow-500/70"}`}
                      style={{ width: `${log.anomalyScore * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bg-[#0d1218] border border-border rounded-lg p-4">
                  <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase mb-2">
                    Model Confidence
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tabular-nums text-[#00d4f5]">
                      {(log.modelConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-[#111827] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00d4f5]"
                      style={{ width: `${log.modelConfidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1218] border border-border rounded-lg px-4 py-3">
                <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase mb-1.5">
                  Affected Service
                </p>
                <p className="text-sm font-mono text-foreground">
                  {log.affectedService}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase mb-3">
                  Event Sequence
                </p>
                <div className="flex flex-col gap-0">
                  {log.eventChain.map((event, idx) => (
                    <div key={idx} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-1 shrink-0 ${idx === 0 ? "bg-[#6b7fa0]" : idx === log.eventChain.length - 1 ? "bg-[#ff3b4e] shadow-[0_0_8px_#ff3b4e60]" : "bg-[#00d4f5]"}`}
                        />
                        {idx < log.eventChain.length - 1 && (
                          <div className="w-px flex-1 bg-border my-1" />
                        )}
                      </div>
                      <div
                        className={`flex-1 mb-2 py-1.5 px-3 rounded text-xs font-mono border ${idx === log.eventChain.length - 1 ? "bg-[#ff3b4e]/8 border-[#ff3b4e]/20 text-[#ff3b4e]" : "bg-[#0d1218] border-border text-foreground"}`}
                      >
                        {event}
                        {idx < log.eventChain.length - 1 && (
                          <span className="text-[#6b7fa0] ml-2">↓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-[#a78bfa]/15">
                    <Cpu size={10} className="text-[#a78bfa]" />
                  </div>
                  <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase">
                    LLM Natural Language Explanation
                  </p>
                </div>
                <div className="bg-[#0d1218] border border-[#a78bfa]/20 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#a78bfa]/40 to-transparent" />
                  <p className="text-sm text-[#c4b5e8] leading-relaxed">
                    {log.explanation}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pb-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded border border-[#ff3b4e]/30 bg-[#ff3b4e]/8 text-[#ff3b4e] text-xs font-semibold hover:bg-[#ff3b4e]/15 transition-colors">
                  <AlertTriangle size={12} />
                  Mark as Incident
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded border border-border bg-[#111827] text-[#6b7fa0] text-xs font-semibold hover:text-foreground hover:border-white/20 transition-colors">
                  <Eye size={12} />
                  Full Trace
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
