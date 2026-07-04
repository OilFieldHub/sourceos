export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  const sizeClasses =
    size === "lg" ? "px-4 py-2 text-2xl" : size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-lg";

  if (score === null) {
    return (
      <span className={`rounded-xl bg-sand font-mono font-bold text-muted ${sizeClasses}`}>UNRATED</span>
    );
  }
  return (
    <span className={`rounded-xl bg-brand-dark font-mono font-extrabold text-white ${sizeClasses}`}>{score}</span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-gold-ink">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}
