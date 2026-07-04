"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";
import { SourceOSMark } from "./sourceos-mark";

const ROLE_LABEL: Record<string, string> = {
  BUYER_ADMIN: "Buyer admin",
  BUYER_USER: "Buyer",
  SUPPLIER_USER: "Supplier",
  ADMIN: "Admin",
};

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { session, logout } = useAuth();
  const router = useRouter();

  if (!session) return null;
  const initials = `${session.user.firstName[0] ?? ""}${session.user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b-[3px] border-gold bg-brand-deep px-4 text-white sm:gap-5 sm:px-6">
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 lg:hidden"
        aria-label="Open navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Logo variant="dark" size={18} />
        </div>
        <span className="truncate text-[14px] font-bold tracking-tight">
          OilfieldHub <SourceOSMark className="text-white/60" />
        </span>
      </Link>

      <div className="flex-1" />

      <Link
        href="/events"
        className="hidden rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white sm:block"
      >
        Event log
      </Link>

      <div className="hidden max-w-[200px] truncate rounded-full bg-app px-3.5 py-1.5 text-[12.5px] font-semibold text-ink sm:block md:max-w-none">
        {ROLE_LABEL[session.user.role] ?? session.user.role} · {session.organization.name}
      </div>

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold transition hover:bg-white/20"
        title={`${session.user.firstName} ${session.user.lastName} — sign out`}
      >
        {initials}
      </button>
    </header>
  );
}
