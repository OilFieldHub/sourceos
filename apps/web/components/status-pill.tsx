import type { Tone } from "@/lib/status";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-sand text-muted",
  amber: "bg-gold-bg text-gold-deep",
  green: "bg-mint text-brand-dark",
  red: "bg-red-bg text-red-deep",
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${TONE_CLASSES[tone]}`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}
