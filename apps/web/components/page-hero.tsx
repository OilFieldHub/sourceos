export function PageHero({
  eyebrow,
  title,
  subtitle,
  stat,
  photoSrc,
  photoAlt,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  stat?: { value: string; label: string };
  photoSrc?: string;
  photoAlt?: string;
}) {
  return (
    <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-brand-dark to-brand-deep px-8 py-12 sm:px-12">
      {/* gold is a structural color here, not a hint of one */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-gold/25 via-gold/5 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-gold/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-60 w-60 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-gold via-gold/40 to-transparent" />

      <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl text-center lg:text-left">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-ink">
            {eyebrow}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-white/75">{subtitle}</p>
          {stat && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-gold/30 bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-2xl font-extrabold text-white">{stat.value}</p>
              <p className="font-mono text-[10.5px] uppercase leading-tight tracking-wide text-gold/90">
                {stat.label}
              </p>
            </div>
          )}
        </div>

        <div className="relative shrink-0">
          <div className="absolute inset-0 -m-2 rounded-[28px] bg-gold/30 blur-2xl" />
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={photoAlt ?? ""}
              className="relative h-32 w-56 rounded-[20px] border-4 border-gold object-cover object-[center_18%] shadow-2xl sm:h-44 sm:w-72 lg:h-52 lg:w-96"
            />
          ) : (
            <div className="relative flex h-32 w-56 items-center justify-center rounded-[20px] border-4 border-dashed border-gold/70 bg-white/10 sm:h-44 sm:w-72 lg:h-52 lg:w-96">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-white/40">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
