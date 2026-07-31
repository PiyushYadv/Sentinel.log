import { CustomTooltip } from "@/components/shared/CustomTooltip";
import { chartData } from "@/lib/mockData";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function MiniChart() {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
      >
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4f5" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#00d4f5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 9, fill: "#6b7fa0" }}
          axisLine={false}
          tickLine={false}
          interval={5}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#6b7fa0" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={CustomTooltip} />
        <ReferenceLine
          y={10}
          stroke="#ff3b4e"
          strokeDasharray="4 3"
          strokeOpacity={0.4}
        />
        <Area
          type="monotone"
          dataKey="anomalies"
          stroke="#00d4f5"
          strokeWidth={1.5}
          fill="url(#heroGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#00d4f5", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
