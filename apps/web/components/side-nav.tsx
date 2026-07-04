"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  href: string;
  label: string;
}

const BUYER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rfqs", label: "RFQs" },
  { href: "/pos", label: "Purchase orders" },
  { href: "/intel", label: "SourceOS intel" },
  { href: "/events", label: "Event log" },
];

const SUPPLIER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rfqs", label: "RFQ inbox" },
  { href: "/pos", label: "Purchase orders" },
  { href: "/events", label: "Event log" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/verification", label: "Verification queue" },
  { href: "/pos", label: "Purchase orders" },
  { href: "/events", label: "Event log" },
];

export function SideNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const pathname = usePathname();
  if (!session) return null;

  const items =
    session.user.role === "SUPPLIER_USER" ? SUPPLIER_ITEMS : session.user.role === "ADMIN" ? ADMIN_ITEMS : BUYER_ITEMS;
  const sectionLabel =
    session.user.role === "SUPPLIER_USER" ? "Supplier portal" : session.user.role === "ADMIN" ? "Platform admin" : "Buyer · Procurement";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-hairline/70 bg-panel px-4 py-6 transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="mb-3 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted/70">
          {sectionLabel}
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all ${
                    active ? "bg-mint font-semibold text-brand-dark" : "text-ink/65 hover:bg-sand hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
