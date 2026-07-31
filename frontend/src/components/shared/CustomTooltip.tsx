import { TooltipContentProps } from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

export function CustomTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1218] border border-white/10 rounded px-3 py-2 shadow-xl">
      <p className="text-[#6b7fa0] text-xs font-mono mb-1">{label}</p>
      <p className="text-[#00d4f5] text-sm font-mono font-medium">
        {payload[0].value} anomalies
      </p>
    </div>
  );
}
