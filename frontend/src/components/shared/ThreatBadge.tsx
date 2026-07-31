"use client";

import { ThreatLevel } from "@/lib/types";

export function ThreatBadge({ level }: { level: ThreatLevel }) {
  const styles: Record<ThreatLevel, string> = {
    HIGH: "bg-red-500/15 text-red-400 border border-red-500/30",
    MEDIUM: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    LOW: "bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wider ${styles[level]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${level === "HIGH" ? "bg-red-400" : level === "MEDIUM" ? "bg-orange-400" : "bg-yellow-500/70"}`}
      />
      {level}
    </span>
  );
}
