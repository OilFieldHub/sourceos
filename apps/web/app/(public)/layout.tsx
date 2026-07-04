import Link from "next/link";
import { Logo } from "@/components/logo";
import { Btn } from "@/components/buttons";
import { SourceOSMark } from "@/components/sourceos-mark";

const NAV_LINKS = [
  { href: "/suppliers", label: "Suppliers" },
  { href: "/categories", label: "Categories" },
  { href: "/rfq-template", label: "RFQ templates" },
  { href: "/guide", label: "Guides" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-hairline/70 bg-panel/90 px-4 backdrop-blur-sm sm:gap-8 sm:px-8">
        <Link href="/suppliers" className="flex shrink-0 items-center gap-2.5">
          <Logo size={24} />
          <span className="hidden text-[14px] font-bold tracking-tight text-ink sm:inline">OilfieldHub</span>
        </Link>
        <Link
          href="/suppliers"
          className="flex shrink-0 items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-semibold text-muted transition hover:border-brand/40 hover:text-brand-dark"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 11.5 12 4l8 7.5M6 10v9h5v-5h2v5h5v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>
        <nav className="hidden gap-6 text-[13.5px] font-medium text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="relative py-1 transition hover:text-brand-dark">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <Link
          href="/login"
          className="hidden text-[13.5px] font-semibold text-muted transition hover:text-brand-dark sm:block"
        >
          Sign in
        </Link>
        <Link href="/register">
          <Btn variant="primary" className="px-3.5 py-1.5 sm:px-4">
            Get started
          </Btn>
        </Link>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>

      <footer className="border-t-[3px] border-gold bg-brand-deep px-4 py-10 text-white sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Logo variant="dark" size={22} />
              <span className="text-[14px] font-bold tracking-tight">OilfieldHub</span>
            </div>
            <p className="max-w-xs text-[13px] text-white/60">
              <SourceOSMark className="font-semibold text-white/80" /> — the procurement operating system for African
              oil &amp; gas. Verified suppliers, transparent scoring, faster sourcing.
            </p>
          </div>
          <div>
            <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-gold">Explore</p>
            <ul className="space-y-2 text-[13.5px] text-white/70">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-gold">Platform</p>
            <ul className="space-y-2 text-[13.5px] text-white/70">
              <li>
                <Link href="/login" className="transition hover:text-white">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition hover:text-white">
                  Register your organization
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl border-t border-white/10 pt-6 text-[12px] text-white/45">
          OilfieldHub — Procurement. Connected. © {new Date().getFullYear()} OilfieldHub <SourceOSMark />
        </div>
      </footer>
    </div>
  );
}
