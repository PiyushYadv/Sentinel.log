"use client";

import { Logo } from "@/components/shared/Logo";
import { ChevronDown, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DashboardHeader({
  activeModel,
  setActiveModel,
}: {
  activeModel: "LSTM" | "GRU";
  setActiveModel: (model: "LSTM" | "GRU") => void;
}) {
  const [modelDropdown, setModelDropdown] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 border-b border-border bg-[#07090d]/95 backdrop-blur-sm">
      <Link href={"/"}>
        <Logo />
      </Link>

      <div className="flex items-center gap-2 relative">
        <span className="text-xs font-mono text-[#6b7fa0] tracking-wider">
          ACTIVE MODEL
        </span>
        <button
          onClick={() => setModelDropdown(!modelDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 bg-[#111827] hover:border-[#00d4f5]/30 transition-all text-sm font-mono text-foreground"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4f5] shadow-[0_0_6px_#00d4f5]" />
          {activeModel}
          <ChevronDown size={12} className="text-[#6b7fa0]" />
        </button>
        {modelDropdown && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-32 bg-[#0d1218] border border-white/10 rounded shadow-2xl z-50 overflow-hidden">
            {(["LSTM", "GRU"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setActiveModel(m);
                  setModelDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-[#111827] transition-colors ${activeModel === m ? "text-[#00d4f5]" : "text-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="flex items-center gap-2 px-4 py-2 rounded bg-[#00d4f5] text-[#07090d] text-sm font-semibold hover:bg-[#00bfdf] transition-colors">
        <Upload size={14} />
        New Upload
      </button>
    </header>
  );
}
