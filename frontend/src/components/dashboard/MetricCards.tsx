import { LogEntry } from "@/lib/types";
import { Activity, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

export function MetricCards({ data }: { data: LogEntry[] }) {
  // 1. Calculate dynamic metrics from the backend data
  const totalAnomalies = data.length;

  const highCount = data.filter((d) => d.threatLevel === "HIGH").length;
  const medCount = data.filter((d) => d.threatLevel === "MEDIUM").length;
  const lowCount = data.filter((d) => d.threatLevel === "LOW").length;

  // 2. Dynamic Health Score (Starts at 100, drops heavily for HIGH threats)
  const penalty = highCount * 5 + medCount * 2 + lowCount * 0.5;
  const healthScore = Math.max(15, 100 - penalty).toFixed(1); // Bottoms out at 15%

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* CARD 1: Total Analyzed */}
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
            Total Blocks Analyzed
          </span>
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[#00d4f5]/10">
            <Activity size={14} className="text-[#00d4f5]" />
          </div>
        </div>
        {/* Using your actual HDFS ground-truth evaluation size as a placeholder */}
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          122,292
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#6b7fa0]">
          <TrendingUp size={11} className="text-[#34d399]" />
          <span className="text-[#34d399] font-mono">Real-time</span>
          <span>LSTM Inference</span>
        </div>
      </div>

      {/* CARD 2: Anomalies & Threat Breakdown */}
      <div className="bg-card border border-[#ff3b4e]/20 rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#ff3b4e]/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <span className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
            Anomalies Detected
          </span>
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[#ff3b4e]/10">
            <AlertTriangle size={14} className="text-[#ff3b4e]" />
          </div>
        </div>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-[#ff3b4e] relative">
          {totalAnomalies}
        </span>
        <div className="flex items-center gap-2 text-xs text-[#6b7fa0] relative">
          <span className="font-mono text-[#ff3b4e]/70">{highCount} HIGH</span>
          <span className="text-white/10">·</span>
          <span className="font-mono text-orange-400/70">{medCount} MED</span>
          <span className="text-white/10">·</span>
          <span className="font-mono text-yellow-500/60">{lowCount} LOW</span>
        </div>
      </div>

      {/* CARD 3: System Health */}
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
            System Health Score
          </span>
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[#34d399]/10">
            <ShieldCheck size={14} className="text-[#34d399]" />
          </div>
        </div>
        <span
          className={`text-3xl font-semibold tabular-nums tracking-tight ${
            parseFloat(healthScore) > 80
              ? "text-[#34d399]"
              : parseFloat(healthScore) > 50
                ? "text-orange-400"
                : "text-[#ff3b4e]"
          }`}
        >
          {healthScore}%
        </span>
        <div className="w-full h-1.5 rounded-full bg-[#111827] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              parseFloat(healthScore) > 80
                ? "bg-linear-to-r from-[#34d399] to-[#00d4f5]"
                : parseFloat(healthScore) > 50
                  ? "bg-linear-to-r from-orange-500 to-yellow-400"
                  : "bg-linear-to-r from-[#ff3b4e] to-orange-500"
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}
