"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SideNav } from "@/components/side-nav";
import { TopBar } from "@/components/top-bar";
import { ActivityTicker } from "@/components/activity-ticker";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-app text-ink/50">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar onMenuClick={() => setNavOpen(true)} />
      <ActivityTicker />
      <div className="flex flex-1">
        <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="flex-1 bg-app px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
