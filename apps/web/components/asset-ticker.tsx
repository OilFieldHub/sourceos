"use client";

import { useEffect, useState } from "react";
import type { MarketQuote } from "@/lib/market-config";

export function AssetTicker() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/market")
        .then((r) => r.json())
        .then((data: { configured: boolean; quotes: MarketQuote[] }) => {
          if (cancelled) return;
          setConfigured(data.configured);
          setQuotes(data.quotes ?? []);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!configured || quotes.length === 0) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-xl bg-ink px-4 text-white/60">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="font-mono text-[10.5px] uppercase tracking-wider">
          Market data not connected — add TWELVE_DATA_API_KEY to show live Brent/WTI/index prices
        </span>
      </div>
    );
  }

  const loop = [...quotes, ...quotes, ...quotes];

  return (
    <div className="group/ticker mb-8 flex h-10 items-stretch overflow-hidden rounded-xl bg-ink">
      <div className="flex shrink-0 items-center gap-2 border-r border-white/10 bg-black/20 px-4">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/60">Markets</span>
      </div>
      <div className="flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <div className="ticker-track flex h-full w-max items-center">
          {loop.map((q, i) => {
            const up = (q.percentChange ?? 0) >= 0;
            return (
              <span
                key={`${q.symbol}-${i}`}
                className="flex items-center gap-2 whitespace-nowrap px-6 font-mono text-[11px] text-white/80"
              >
                <span className="font-bold text-gold">{q.label}</span>
                <span className="text-white">
                  {q.price !== null ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                </span>
                <span className="text-white/40">{q.unit}</span>
                {q.percentChange !== null && (
                  <span className={up ? "text-mint-border" : "text-red"}>
                    {up ? "▲" : "▼"} {Math.abs(q.percentChange).toFixed(2)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
