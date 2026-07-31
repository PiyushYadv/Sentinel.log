import { Activity, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

export function MetricCards() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
            Total Logs Analyzed
          </span>
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[#00d4f5]/10">
            <Activity size={14} className="text-[#00d4f5]" />
          </div>
        </div>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          4,821,037
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#6b7fa0]">
          <TrendingUp size={11} className="text-[#34d399]" />
          <span className="text-[#34d399] font-mono">+12.4%</span>
          <span>vs. last 24h</span>
        </div>
      </div>

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
          1,247
        </span>
        <div className="flex items-center gap-2 text-xs text-[#6b7fa0] relative">
          <span className="font-mono text-[#ff3b4e]/70">312 HIGH</span>
          <span className="text-white/10">·</span>
          <span className="font-mono text-orange-400/70">589 MED</span>
          <span className="text-white/10">·</span>
          <span className="font-mono text-yellow-500/60">346 LOW</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
            System Health Score
          </span>
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[#34d399]/10">
            <ShieldCheck size={14} className="text-[#34d399]" />
          </div>
        </div>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-[#34d399]">
          87.3%
        </span>
        <div className="w-full h-1.5 rounded-full bg-[#111827] overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#34d399] to-[#00d4f5]"
            style={{ width: "87.3%" }}
          />
        </div>
      </div>
    </div>
  );
}
