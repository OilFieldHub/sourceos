export function ScoreBar({ label, value, tone }: { label: string; value: number; tone: "ink" | "green" | "risk" }) {
  const barColor = tone === "ink" ? "bg-ink" : tone === "green" ? "bg-brand" : value < 60 ? "bg-red" : "bg-gold";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-muted">{label}</span>
        <span className="font-mono text-[11.5px] font-semibold text-ink">{value}</span>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-sand">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
