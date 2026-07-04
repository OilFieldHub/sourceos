"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { ChainVerification, Event } from "@/lib/types";

export default function EventsPage() {
  const api = useAuthedApi();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [chain, setChain] = useState<ChainVerification | null>(null);

  useEffect(() => {
    api.get<{ events: Event[]; chain: ChainVerification }>("/events").then((r) => {
      setEvents([...r.events].reverse());
      setChain(r.chain);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!events || !chain) return <p className="text-ink/50">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Event log</h1>
      <p className="mb-6 font-mono text-[11px] text-ink/45">
        APPEND-ONLY · HASH-CHAINED · CHAIN VERIFIED {chain.valid ? "✓" : "✕"} · {events.length} EVENTS
      </p>

      <div className="overflow-hidden rounded-xl bg-band-dark">
        <div className="divide-y divide-white/10">
          {events.map((e) => (
            <div key={e.id} className="grid grid-cols-[110px_90px_140px_140px_1fr] items-center gap-3 px-5 py-3">
              <span className="font-mono text-[11px] text-white/40">{formatDateTime(e.createdAt)}</span>
              <span className="truncate font-mono text-[10.5px] text-white/25">#{e.hash.slice(0, 8)}</span>
              <span className="font-mono text-[11.5px] font-semibold text-amber">{e.type}</span>
              <span className="truncate font-mono text-[11.5px] text-safe">{e.entityType}</span>
              <span className="truncate text-[12px] text-white/75">{e.note}</span>
            </div>
          ))}
          {events.length === 0 && <p className="px-5 py-6 text-[13px] text-white/40">No events recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
