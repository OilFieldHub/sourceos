"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { ChainVerification, Event } from "@/lib/types";

function eventLabel(type: string): string {
  return type.replaceAll("_", " ");
}

export function ActivityTicker() {
  const api = useAuthedApi();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .get<{ events: Event[]; chain: ChainVerification }>("/events")
        .then((r) => {
          if (!cancelled) setEvents([...r.events].reverse().slice(0, 12));
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (events.length === 0) return null;
  const loop = [...events, ...events];

  return (
    <div className="group/ticker flex h-9 shrink-0 items-stretch overflow-hidden border-b border-white/10 bg-brand-deep">
      <div className="flex shrink-0 items-center gap-2 border-r border-white/10 bg-black/15 px-4">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-gold" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/60">
          Live activity
        </span>
      </div>
      <div className="flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <div className="ticker-track flex w-max items-center">
          {loop.map((e, i) => (
            <span
              key={`${e.id}-${i}`}
              className="flex items-center gap-2 whitespace-nowrap px-6 font-mono text-[11px] text-white/80"
            >
              <span className="font-bold text-gold">{eventLabel(e.type)}</span>
              {e.note && <span className="text-white/50">{e.note}</span>}
              <span className="text-white/30">· {formatRelative(e.createdAt)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
