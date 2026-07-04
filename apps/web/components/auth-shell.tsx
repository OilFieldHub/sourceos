import { Logo } from "./logo";

const VALUE_PROPS = [
  "Weighted, explainable supplier evaluation",
  "Escrow-backed purchase orders with a hash-chained audit trail",
  "SourceOS scoring that rewards clean, on-time delivery",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app">
      <div className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-brand-deep px-12 py-14 text-white lg:flex">
        <img
          src="/images/auth-office.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_30%] opacity-25"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/85 to-brand-deep/40" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 85% 75%, white 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Logo variant="dark" size={22} />
          </div>
          <span className="text-[15px] font-bold tracking-tight">OilfieldHub</span>
        </div>

        <div className="relative">
          <h1 className="mb-4 max-w-sm text-[32px] font-bold leading-[1.15] tracking-tight">
            Procurement, connected.
          </h1>
          <p className="mb-8 max-w-sm text-[14.5px] leading-relaxed text-white/65">
            The operating system for African oil &amp; gas sourcing — from requirement to payment, every step
            verified.
          </p>
          <ul className="space-y-3">
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15 text-[9px]">
                  ✓
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[11px] uppercase tracking-wider text-white/35">
          Sahara Energy E&amp;P · Deepwater Assets · GulfTech Fabrication
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
