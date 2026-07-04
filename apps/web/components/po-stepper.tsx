import type { PoStage } from "@/lib/types";

const STAGES: { key: PoStage; label: string }[] = [
  { key: "ISSUED", label: "Issued" },
  { key: "ACKNOWLEDGED", label: "Acknowledged" },
  { key: "GRN_RECEIVED", label: "GRN received" },
  { key: "INSPECTED", label: "Inspection" },
  { key: "INVOICED", label: "Invoiced" },
  { key: "PAID", label: "Paid" },
];

export function PoStepper({ stage }: { stage: PoStage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-start">
      {STAGES.map((s, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold transition-colors ${
                  isDone
                    ? "bg-brand text-white"
                    : isCurrent
                      ? "bg-gold text-white shadow-[0_0_0_4px_var(--color-gold-bg)]"
                      : "border-[1.5px] border-hairline bg-panel text-muted"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`h-[2px] flex-1 ${i < currentIndex ? "bg-brand" : "bg-hairline"}`} />
              )}
            </div>
            <span
              className={`mt-2.5 text-center text-[11.5px] ${
                isCurrent ? "font-semibold text-ink" : isDone ? "font-medium text-muted" : "text-muted/60"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
