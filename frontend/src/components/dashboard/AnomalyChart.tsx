"use client";

import { CustomTooltip } from "@/components/shared/CustomTooltip";
import { LogEntry } from "@/lib/types";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type View = "timeline" | "distribution";

interface Bucket {
  label: string;
  anomalies: number;
  // Distribution only: bin centre on the numeric score axis, and its range for the tooltip
  x?: number;
  range?: string;
}

const AXIS_TICK = {
  fontSize: 10,
  fill: "#6b7fa0",
  fontFamily: "JetBrains Mono, monospace",
};

// Candidate bucket widths (ms); the smallest that keeps the timeline <= MAX_BUCKETS wins
const BUCKET_SIZES = [
  1_000, 5_000, 10_000, 30_000, 60_000, 300_000, 900_000, 1_800_000, 3_600_000,
  21_600_000, 86_400_000,
];
const MAX_BUCKETS = 24;
const SCORE_BINS = 10;

// Backend thresholds in ml_service.py: score > 0.95 → MEDIUM, > 0.99 → HIGH
const THREAT_THRESHOLDS = [0.95, 0.99];

function parseTimestamp(ts: string): number {
  // "YYYY-MM-DD HH:MM:SS[.mmm]" — treat as local time, like the backend emits it
  return new Date(ts.replace(" ", "T")).getTime();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatBucketLabel(t: number, size: number, spansDays: boolean) {
  const d = new Date(t);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const time = size < 60_000 ? `${hm}:${pad(d.getSeconds())}` : hm;
  if (size >= 86_400_000) return `${d.getMonth() + 1}/${d.getDate()}`;
  return spansDays ? `${d.getMonth() + 1}/${d.getDate()} ${time}` : time;
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${ms / 1000}s`;
  if (ms < 3_600_000) return `${ms / 60_000}m`;
  if (ms < 86_400_000) return `${ms / 3_600_000}h`;
  return `${ms / 86_400_000}d`;
}

// Anomaly counts per time bucket, with empty buckets kept so gaps read as zero
function buildTimeline(data: LogEntry[]) {
  const times = data.map((d) => parseTimestamp(d.timestamp)).filter(Number.isFinite);
  if (times.length === 0) return { buckets: [] as Bucket[], bucketSize: 0 };

  const min = Math.min(...times);
  const max = Math.max(...times);
  const bucketSize =
    BUCKET_SIZES.find((s) => (max - min) / s < MAX_BUCKETS) ??
    BUCKET_SIZES[BUCKET_SIZES.length - 1];
  const start = Math.floor(min / bucketSize) * bucketSize;
  const count = Math.floor((max - start) / bucketSize) + 1;
  const spansDays = new Date(min).toDateString() !== new Date(max).toDateString();

  const counts = new Array(count).fill(0);
  for (const t of times) counts[Math.floor((t - start) / bucketSize)]++;

  return {
    bucketSize,
    buckets: counts.map((anomalies, i) => ({
      label: formatBucketLabel(start + i * bucketSize, bucketSize, spansDays),
      anomalies,
    })),
  };
}

// Histogram of anomaly scores between the lowest observed score (rounded down) and 1.0
function buildDistribution(data: LogEntry[]) {
  if (data.length === 0) return { buckets: [] as Bucket[], lower: 0, ticks: [] };

  const minScore = Math.min(...data.map((d) => d.anomalyScore));
  const lower = Math.min(0.9, Math.floor(minScore * 10) / 10);
  const width = (1 - lower) / SCORE_BINS;
  const counts = new Array(SCORE_BINS).fill(0);
  for (const d of data) {
    const idx = Math.min(SCORE_BINS - 1, Math.floor((d.anomalyScore - lower) / width));
    counts[Math.max(0, idx)]++;
  }

  const digits = width < 0.01 ? 3 : 2;
  return {
    lower,
    // Label every other bin edge so ticks don't crowd
    ticks: Array.from({ length: SCORE_BINS / 2 + 1 }, (_, i) => lower + i * 2 * width),
    buckets: counts.map((anomalies, i) => {
      const from = lower + i * width;
      return {
        label: from.toFixed(digits),
        x: from + width / 2,
        range: `${from.toFixed(digits)}–${(from + width).toFixed(digits)}`,
        anomalies,
      };
    }),
  };
}

export function AnomalyChart({
  activeModel,
  data,
}: {
  activeModel: "LSTM" | "GRU";
  data: LogEntry[];
}) {
  const [view, setView] = useState<View>("timeline");

  const timeline = useMemo(() => buildTimeline(data), [data]);
  const distribution = useMemo(() => buildDistribution(data), [data]);

  const isTimeline = view === "timeline";
  const buckets = isTimeline ? timeline.buckets : distribution.buckets;
  const hasData = buckets.some((b) => b.anomalies > 0);
  // A one-bar chart says nothing a number can't — show the number instead
  const singleBucket = isTimeline && buckets.length === 1;
  const tickInterval = Math.max(0, Math.ceil(buckets.length / 8) - 1);

  const thresholds = isTimeline
    ? []
    : THREAT_THRESHOLDS.filter((t) => t > distribution.lower);

  const subtitle = isTimeline
    ? timeline.bucketSize
      ? `${formatDuration(timeline.bucketSize)} buckets — ${activeModel} inference`
      : `${activeModel} inference`
    : `Anomaly score histogram — ${activeModel} inference`;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {isTimeline ? "Anomaly Frequency" : "Anomaly Score Distribution"}
          </h2>
          <p className="text-xs text-[#6b7fa0] mt-0.5 font-mono">{subtitle}</p>
          {thresholds.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-[#6b7fa0] mt-1.5 font-mono">
              <span className="w-3 h-px border-t border-dashed border-[#ff3b4e]/60" />
              Threat thresholds: MED &gt; 0.95 · HIGH &gt; 0.99
            </p>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Chart view"
          className="flex rounded border border-border bg-[#07090d] p-0.5 text-xs font-mono"
        >
          {(
            [
              ["timeline", "Frequency Timeline"],
              ["distribution", "Score Distribution"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={`px-3 py-1.5 rounded-sm text-xs transition-colors ${
                view === value
                  ? "bg-[#111827] text-foreground"
                  : "text-[#6b7fa0] hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {singleBucket ? (
        <div className="h-60 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-4xl font-semibold text-foreground">
            {data.length}
          </span>
          <span className="text-xs font-mono text-[#6b7fa0]">
            {data.length === 1
              ? `anomaly at ${data[0].timestamp}`
              : `anomalies within one ${formatDuration(timeline.bucketSize)} window`}
            <br />
            Not enough spread for a timeline — try the score distribution.
          </span>
        </div>
      ) : hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={buckets}
            margin={{ top: 16, right: 16, bottom: 0, left: -16 }}
            barCategoryGap={2}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            {isTimeline ? (
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                interval={tickInterval}
              />
            ) : (
              // Numeric axis so threshold lines land at their exact score
              <XAxis
                dataKey="x"
                type="number"
                domain={[distribution.lower, 1]}
                ticks={distribution.ticks}
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={AXIS_TICK}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
            )}
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={CustomTooltip}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            {thresholds.map((t) => (
              <ReferenceLine
                key={t}
                x={t}
                stroke="#ff3b4e"
                strokeOpacity={0.5}
                strokeDasharray="4 3"
              />
            ))}
            <Bar
              dataKey="anomalies"
              fill="#00d4f5"
              fillOpacity={0.85}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              activeBar={{ fillOpacity: 1 }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-60 flex items-center justify-center text-xs font-mono text-[#6b7fa0]">
          No anomalies to chart.
        </div>
      )}
    </div>
  );
}
