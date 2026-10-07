import { CheckCircle2, XCircle } from "lucide-react";

// Offline benchmark of the LSTM (top-k = 4) against HDFS ground-truth labels (ml/evaluate.py)
const BENCHMARK = { tp: 9327, fp: 362, tn: 111283, fn: 1320 };

const total = BENCHMARK.tp + BENCHMARK.fp + BENCHMARK.tn + BENCHMARK.fn;
const precision = BENCHMARK.tp / (BENCHMARK.tp + BENCHMARK.fp);
const recall = BENCHMARK.tp / (BENCHMARK.tp + BENCHMARK.fn);
const f1 = (2 * precision * recall) / (precision + recall);
const accuracy = (BENCHMARK.tp + BENCHMARK.tn) / total;

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const metrics = [
  { label: "Precision", value: precision, note: "flagged blocks that were real anomalies" },
  { label: "Recall", value: recall, note: "up to ~94% with a tuned threshold" },
  { label: "F1 Score", value: f1, note: "harmonic mean of precision & recall" },
];

// Rows = actual class, columns = predicted class
const cells = [
  { key: "TP", name: "True Positive", value: BENCHMARK.tp, correct: true, rowTotal: BENCHMARK.tp + BENCHMARK.fn },
  { key: "FN", name: "False Negative", value: BENCHMARK.fn, correct: false, rowTotal: BENCHMARK.tp + BENCHMARK.fn },
  { key: "FP", name: "False Positive", value: BENCHMARK.fp, correct: false, rowTotal: BENCHMARK.fp + BENCHMARK.tn },
  { key: "TN", name: "True Negative", value: BENCHMARK.tn, correct: true, rowTotal: BENCHMARK.fp + BENCHMARK.tn },
];

export function ConfusionMatrix() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Model Benchmark
          </h2>
          <p className="text-xs text-[#6b7fa0] mt-0.5 font-mono">
            HDFS ground truth · {total.toLocaleString()} blocks · Top-K = 4
          </p>
        </div>
        <span className="text-xs font-mono text-[#6b7fa0]">
          Accuracy {pct(accuracy)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="bg-[#07090d]/60 border border-border rounded-lg px-4 py-3"
            >
              <p className="text-[10px] font-mono text-[#6b7fa0] tracking-wider uppercase">
                {m.label}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {pct(m.value)}
              </p>
              <p className="text-[11px] text-[#6b7fa0] mt-0.5">{m.note}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-0.5 text-xs font-mono">
            <div />
            <div className="pb-2 text-center text-[10px] text-[#6b7fa0] tracking-wider uppercase">
              Predicted anomaly
            </div>
            <div className="pb-2 text-center text-[10px] text-[#6b7fa0] tracking-wider uppercase">
              Predicted normal
            </div>
            {[0, 1].map((row) => (
              <div key={row} className="contents">
                <div className="pr-3 self-center text-right text-[10px] text-[#6b7fa0] tracking-wider uppercase leading-tight">
                  Actual
                  <br />
                  {row === 0 ? "anomaly" : "normal"}
                </div>
                {cells.slice(row * 2, row * 2 + 2).map((c) => {
                  const Icon = c.correct ? CheckCircle2 : XCircle;
                  return (
                    <div
                      key={c.key}
                      title={`${c.name}: ${c.value.toLocaleString()} (${pct(c.value / c.rowTotal)} of actual ${row === 0 ? "anomalies" : "normal blocks"})`}
                      className={`rounded-md p-4 flex flex-col gap-1 ${
                        c.correct
                          ? "bg-[#34d399]/8 border border-[#34d399]/20"
                          : "bg-[#ff3b4e]/8 border border-[#ff3b4e]/20"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] text-[#6b7fa0] tracking-wider uppercase">
                        <Icon
                          size={11}
                          className={c.correct ? "text-[#34d399]" : "text-[#ff3b4e]"}
                        />
                        {c.key} · {c.name}
                      </span>
                      <span className="text-xl font-semibold text-foreground font-sans">
                        {c.value.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-[#6b7fa0]">
                        {pct(c.value / c.rowTotal)} of row
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
