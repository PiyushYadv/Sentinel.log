// components/shared/ProcessingScreen.tsx
import { Terminal, Cpu, Database } from "lucide-react";
import { useEffect, useState } from "react";

export function ProcessingScreen() {
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);

  // Fake terminal output progression for visual effect
  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 1200); // Drain3 Parsing
    const timer2 = setTimeout(() => setStep(2), 2800); // LSTM Inference
    // Analysis normally takes well under a second; a long wait means the backend is cold-starting
    const timer3 = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090d]/95 backdrop-blur-md font-mono">
      <div className="w-112.5 p-6 rounded-lg border border-[#00d4f5]/20 bg-[#0d1218] shadow-[0_0_40px_rgba(0,212,245,0.05)]">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <div className="w-8 h-8 rounded flex items-center justify-center bg-[#00d4f5]/10 animate-pulse">
            <Cpu size={16} className="text-[#00d4f5]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Processing Log Stream
            </h3>
            <p className="text-xs text-[#6b7fa0]">Pipeline active...</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Step 1: Upload & Parse */}
          <div className="flex items-center gap-3">
            <Database
              size={14}
              className={step >= 0 ? "text-[#00d4f5]" : "text-[#6b7fa0]/40"}
            />
            <span
              className={step >= 0 ? "text-foreground" : "text-[#6b7fa0]/40"}
            >
              {step > 0
                ? "[✓] Logs ingested and templated (Drain3)"
                : "[ ] Ingesting raw logs..."}
            </span>
          </div>

          {/* Step 2: Model Inference */}
          <div className="flex items-center gap-3">
            <Cpu
              size={14}
              className={step >= 1 ? "text-[#a78bfa]" : "text-[#6b7fa0]/40"}
            />
            <span
              className={step >= 1 ? "text-foreground" : "text-[#6b7fa0]/40"}
            >
              {step > 1
                ? "[✓] Sequence anomalies detected (PyTorch)"
                : step === 1
                  ? "[ ] Running LSTM inference..."
                  : "[ ] Waiting for sequence builder..."}
            </span>
          </div>

          {/* Step 3: LLM Context */}
          <div className="flex items-center gap-3">
            <Terminal
              size={14}
              className={step >= 2 ? "text-[#34d399]" : "text-[#6b7fa0]/40"}
            />
            <span
              className={step >= 2 ? "text-foreground" : "text-[#6b7fa0]/40"}
            >
              {step >= 2
                ? "[ ] Preparing dashboard..."
                : "[ ] Awaiting flagged sequences..."}
            </span>
          </div>
        </div>

        {slow && (
          <p className="mt-5 text-[11px] leading-relaxed text-[#6b7fa0]">
            The ML backend runs on a free tier and sleeps when idle. Waking it
            up can take up to a minute on the first request.
          </p>
        )}

        <div className="mt-6 h-1 w-full bg-[#111827] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00d4f5] transition-all duration-1000 ease-out rounded-full"
            style={{ width: step === 0 ? "33%" : step === 1 ? "66%" : "95%" }}
          />
        </div>
      </div>
    </div>
  );
}
