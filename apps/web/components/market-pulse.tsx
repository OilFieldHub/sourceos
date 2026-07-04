"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import type { MarketQuote } from "@/lib/market-config";

export function MarketPulse() {
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

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-ink">Market pulse</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
          {configured ? "Live" : "Not connected"}
        </span>
      </div>
      {!configured ? (
        <p className="rounded-xl bg-sand px-3.5 py-2.5 text-[12.5px] text-muted">
          Add a <code className="font-mono">TWELVE_DATA_API_KEY</code> to <code className="font-mono">.env.local</code>{" "}
          to show live Brent/WTI/index prices here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quotes.map((q) => {
            const up = (q.percentChange ?? 0) >= 0;
            return (
              <div key={q.symbol} className="rounded-xl bg-row px-3 py-2.5">
                <p className="font-mono text-[9.5px] uppercase tracking-wide text-muted">{q.label}</p>
                <p className="mt-1 text-[15px] font-bold text-ink">
                  {q.price !== null ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  <span className="ml-1 text-[10px] font-medium text-muted">{q.unit}</span>
                </p>
                {q.percentChange !== null && (
                  <p className={`mt-0.5 text-[11px] font-semibold ${up ? "text-brand-dark" : "text-red"}`}>
                    {up ? "▲" : "▼"} {Math.abs(q.percentChange).toFixed(2)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
