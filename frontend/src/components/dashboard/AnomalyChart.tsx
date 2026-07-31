"use client";

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

export function AnomalyChart({ activeModel }: { activeModel: "LSTM" | "GRU" }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Anomaly Frequency
          </h2>
          <p className="text-xs text-[#6b7fa0] mt-0.5 font-mono">
            24h rolling window — {activeModel} inference
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#00d4f5]" />
            <span className="text-[#6b7fa0]">Detected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px border-t border-dashed border-[#ff3b4e]/60" />
            <span className="text-[#6b7fa0]">Threshold</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4f5" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#00d4f5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            key="grid"
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            key="xaxis"
            dataKey="time"
            tick={{
              fontSize: 10,
              fill: "#6b7fa0",
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis
            key="yaxis"
            tick={{
              fontSize: 10,
              fill: "#6b7fa0",
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip key="tooltip" content={CustomTooltip} />
          <ReferenceLine
            key="refline"
            y={10}
            stroke="#ff3b4e"
            strokeDasharray="4 3"
            strokeOpacity={0.5}
          />
          <Area
            key="area"
            type="monotone"
            dataKey="anomalies"
            stroke="#00d4f5"
            strokeWidth={1.5}
            fill="url(#areaGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#00d4f5", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
