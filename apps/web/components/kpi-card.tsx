export function KpiCard({
  label,
  value,
  note,
  noteTone,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  noteTone?: "green" | "gold" | "neutral";
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_1px_2px_rgba(13,43,30,0.04),0_8px_24px_-12px_rgba(13,43,30,0.10)] ${
        accent ? "border-gold-border bg-gold-bg" : "border-hairline/70 bg-panel"
      }`}
    >
      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-[26px] font-bold tracking-tight ${accent ? "text-gold-ink" : "text-ink"}`}>{value}</p>
      {note && (
        <p
          className={`mt-1.5 text-[11.5px] ${
            noteTone === "green" ? "font-semibold text-brand-dark" : noteTone === "gold" ? "font-semibold text-gold-deep" : "text-muted"
          }`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
