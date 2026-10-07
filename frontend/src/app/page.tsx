"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  AlertTriangle,
  Upload,
  ChevronRight,
  Terminal,
  Clock,
  Hash,
  Brain,
  Database,
  FileSearch,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  X,
} from "lucide-react";

import { ProcessingScreen } from "@/components/shared/ProcessingScreen";
import { Logo } from "@/components/shared/Logo";
import { ThreatBadge } from "@/components/shared/ThreatBadge";
import { logEntries } from "@/lib/mockData";
import { MiniChart } from "@/components/home/MiniChart";
import { useAnalyzeLogs, useBackendWarmup } from "@/lib/api";

// ── Data Arrays ─────────────────────────────────────────────────────────────

const features = [
  {
    icon: Brain,
    title: "LSTM Sequence Models",
    desc: "A PyTorch-trained LSTM learns the normal rhythm of your system execution and flags deviations.",
    accent: "#00d4f5",
  },
  {
    icon: FileSearch,
    title: "LLM Diagnostics",
    desc: "Flagged sequences are sent to the Gemini API to generate plain-English explanations of the anomaly.",
    accent: "#a78bfa",
  },
  {
    icon: Database,
    title: "Automated Log Parsing",
    desc: "Powered by Drain3, the pipeline automatically tokenizes raw text logs into structured event sequences.",
    accent: "#34d399",
  },
  {
    icon: BarChart3,
    title: "Interactive Visualization",
    desc: "A Next.js and Recharts dashboard visualizes anomaly frequency and provides detailed sequence inspection.",
    accent: "#f97316",
  },
];

const steps = [
  {
    num: "01",
    title: "Upload Logs",
    body: "Drop raw log files. Sentinel.log handles template mining and sliding-window segmentation automatically via Drain3.",
  },
  {
    num: "02",
    title: "Run Inference",
    body: "The PyTorch LSTM scores each sequence against the trained baseline distribution and ranks by deviation.",
  },
  {
    num: "03",
    title: "Inspect & Explain",
    body: "Click any flagged sequence to open the AI explanation panel. The Gemini API describes the anomaly in plain English.",
  },
];

const stats = [
  { value: "4.8B+", label: "Log events processed" },
  { value: "99.1%", label: "Detection precision" },
  { value: "<340ms", label: "Median inference latency" },
  { value: "62×", label: "Faster than manual SOC triage" },
];

const testimonials: { quote: string; name: string; role: string }[] = [
  //   {
  //     quote:
  //       "Sentinel.log caught a cryptomining payload that slipped past our WAF. The sequence view made the root cause obvious in under two minutes.",
  //     name: "Priya Anand",
  //     role: "Staff SRE, Fintech Platform",
  //   },
  //   {
  //     quote:
  //       "We replaced hundreds of hand-crafted Regex rules with a single LSTM model. False positive rate dropped by 78% on day one.",
  //     name: "Marcus Breit",
  //     role: "Head of Security Engineering",
  //   },
  //   {
  //     quote:
  //       "The LLM explanation block alone is incredible. It maps raw server IDs into a narrative that any on-call engineer can instantly understand.",
  //     name: "Tomoko Igarashi",
  //     role: "VP Engineering",
  //   },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  useBackendWarmup();
  const analyzeMutation = useAnalyzeLogs({
    onSuccess: () => router.push("/dashboard"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeMutation.mutate(file);
    // Reset so selecting the same file again still triggers onChange
    e.target.value = "";
  };

  const handleUploadClick = () => {
    analyzeMutation.reset();
    fileInputRef.current?.click();
  };

  const handleViewDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground font-['Inter',sans-serif]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".log,.txt,.csv"
      />

      {analyzeMutation.isPending && <ProcessingScreen />}

      {analyzeMutation.isError && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded border border-[#ff3b4e]/30 bg-[#1a0b0f] text-sm text-[#ff3b4e] shadow-2xl max-w-[90vw]"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>Analysis failed: {analyzeMutation.error.message}</span>
          <button
            onClick={() => analyzeMutation.reset()}
            className="text-[#6b7fa0] hover:text-foreground"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-8 border-b border-border bg-[#07090d]/95 backdrop-blur-sm">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-sm text-[#6b7fa0]">
          <Link
            href="https://github.com/PiyushYadv/Sentinel.log"
            target="_blank"
            className="hover:text-foreground transition-colors"
          >
            GitHub Repo
          </Link>
          <Link
            href="https://github.com/PiyushYadv/Sentinel.log#architecture"
            target="_blank"
            className="hover:text-foreground transition-colors"
          >
            Architecture
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[#00d4f5] text-[#07090d] text-sm font-semibold hover:bg-[#00bfdf] transition-colors"
          >
            Upload Logs
            <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      <div className="pt-14">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(0,212,245,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,245,0.03) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 rounded-full bg-[#00d4f5]/5 blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00d4f5]/20 bg-[#00d4f5]/5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4f5] shadow-[0_0_8px_#00d4f5]" />
              <span className="text-xs font-mono text-[#00d4f5] tracking-wider">
                PYTORCH · LSTM · DRAIN3 · GEMINI API
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-foreground mb-6">
              Anomaly detection
              <br />
              <span className="text-[#00d4f5]">that thinks</span> in sequences.
            </h1>

            <p className="text-lg text-[#6b7fa0] max-w-2xl mx-auto leading-relaxed mb-10">
              Sentinel.log runs a PyTorch LSTM model against your server logs,
              scores every event sequence against a learned baseline, and
              explains what it found in plain English.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleUploadClick}
                className="flex items-center gap-2 px-6 py-3 rounded bg-[#00d4f5] text-[#07090d] font-semibold hover:bg-[#00bfdf] transition-colors"
              >
                <Upload size={16} /> Upload Logs & Analyze
              </button>
              <button
                onClick={handleViewDashboard}
                className="flex items-center gap-2 px-6 py-3 rounded border border-border text-[#6b7fa0] hover:border-white/20 hover:text-foreground transition-all font-medium"
              >
                View Demo Dashboard <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Hero mini-chart */}
          <div className="relative z-10 mt-16 w-full max-w-3xl mx-auto rounded-lg border border-border bg-[#0d1218]/80 backdrop-blur-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-[#6b7fa0] tracking-wider uppercase">
                  Anomaly Frequency · Live Preview
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4f5] shadow-[0_0_6px_#00d4f5] animate-pulse" />
                <span className="text-xs font-mono text-[#00d4f5]">
                  LSTM · ACTIVE
                </span>
              </div>
            </div>
            <MiniChart />
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <section className="border-t border-b border-border py-12 px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-semibold text-[#00d4f5] tabular-nums">
                  {s.value}
                </p>
                <p className="text-xs font-mono text-[#6b7fa0] mt-1 tracking-wide">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Capabilities ─────────────────────────────────────────────────── */}
        <section className="py-24 px-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-14">
              <p className="text-xs font-mono text-[#6b7fa0] tracking-widest uppercase mb-3">
                Capabilities
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight max-w-xl">
                Everything a modern security team needs — nothing they
                don&apos;t.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-[#0d1218] p-6 hover:bg-[#0f141c] transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center mb-4"
                    style={{
                      background: `${f.accent}18`,
                      border: `1px solid ${f.accent}30`,
                    }}
                  >
                    <f.icon size={15} style={{ color: f.accent }} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[#6b7fa0] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="py-24 px-8 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <div className="mb-14">
              <p className="text-xs font-mono text-[#6b7fa0] tracking-widest uppercase mb-3">
                How It Works
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
                From raw logs to AI explanation
                <br />
                in three steps.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <div key={step.num} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-8 h-px bg-linear-to-r from-border to-transparent z-10" />
                  )}
                  <div className="text-4xl font-mono font-semibold text-[#00d4f5]/20 mb-4 tabular-nums">
                    {step.num}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#6b7fa0] leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Log Preview Table ────────────────────────────────────────────── */}
        <section className="py-24 px-8 border-t border-border bg-[#0d1218]/40">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs font-mono text-[#6b7fa0] tracking-widest uppercase mb-3">
                  Live Data Preview
                </p>
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">
                  Every flagged sequence,
                  <br />
                  explained and ranked.
                </h2>
              </div>
              <button
                onClick={handleViewDashboard}
                className="flex items-center gap-2 px-5 py-2.5 rounded border border-[#00d4f5]/30 text-[#00d4f5] text-sm font-semibold hover:bg-[#00d4f5]/8 transition-colors"
              >
                Open Dashboard <ArrowRight size={14} />
              </button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[190px_130px_100px_1fr] text-[11px] font-mono text-[#6b7fa0] tracking-wider uppercase px-5 py-2.5 border-b border-border bg-[#07090d]/60">
                <div className="flex items-center gap-1.5">
                  <Clock size={10} />
                  Timestamp
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash size={10} />
                  Sequence ID
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={10} />
                  Threat
                </div>
                <div className="flex items-center gap-1.5">
                  <Terminal size={10} />
                  Raw Log Preview
                </div>
              </div>
              {logEntries.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[190px_130px_100px_1fr] px-5 py-3.5 border-b border-border hover:bg-white/2"
                >
                  <span className="font-mono text-xs text-[#6b7fa0] self-center">
                    {entry.timestamp}
                  </span>
                  <span className="font-mono text-xs text-[#00d4f5] self-center">
                    {entry.sequenceId}
                  </span>
                  <span className="self-center">
                    <ThreatBadge level={entry.threatLevel} />
                  </span>
                  <span className="font-mono text-xs text-[#6b7fa0] self-center truncate pr-4">
                    {entry.logPreview}
                  </span>
                </div>
              ))}
              <div className="relative h-20 flex items-center justify-center bg-linear-to-t from-[#0d1218] to-transparent border-t border-border">
                <button
                  onClick={handleViewDashboard}
                  className="flex items-center gap-2 px-5 py-2 rounded bg-[#00d4f5] text-[#07090d] text-sm font-semibold hover:bg-[#00bfdf] transition-colors shadow-lg"
                >
                  View all anomalies <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        {testimonials && (
          <section className="py-24 px-8 border-t border-border">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-mono text-[#6b7fa0] tracking-widest uppercase mb-12">
                What teams say
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div
                    key={t.name}
                    className="bg-[#0d1218] border border-border rounded-lg p-6 flex flex-col gap-4"
                  >
                    <p className="text-sm text-[#9aafc8] leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-auto pt-4 border-t border-border">
                      <p className="text-sm font-medium text-foreground">
                        {t.name}
                      </p>
                      <p className="text-xs font-mono text-[#6b7fa0] mt-0.5">
                        {t.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-24 px-8 border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              {[
                "No rules to write.",
                "No SIEM required.",
                "Automated diagnostics.",
              ].map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#6b7fa0]"
                >
                  <CheckCircle2 size={11} className="text-[#34d399]" />
                  {s}
                </div>
              ))}
            </div>
            <h2 className="text-4xl font-semibold text-foreground tracking-tight mb-4">
              Stop writing rules.
              <br />
              Start detecting anomalies.
            </h2>
            <button
              onClick={handleUploadClick}
              className="mt-8 flex items-center gap-2 px-8 py-3.5 rounded bg-[#00d4f5] text-[#07090d] font-semibold text-base hover:bg-[#00bfdf] transition-colors mx-auto"
            >
              <Upload size={16} /> Analyze your logs
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
