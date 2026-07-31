import { Zap } from "lucide-react";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 group">
      <div className="relative w-7 h-7 flex items-center justify-center">
        <div className="absolute inset-0 rounded border border-[#00d4f5]/40 bg-[#00d4f5]/5 group-hover:border-[#00d4f5]/60 transition-colors" />
        <Zap size={14} className="text-[#00d4f5] relative z-10" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Sentinel.log
        </span>
        <span className="text-[10px] font-mono text-[#6b7fa0] tracking-widest uppercase">
          AI Log Intelligence
        </span>
      </div>
    </button>
  );
}
