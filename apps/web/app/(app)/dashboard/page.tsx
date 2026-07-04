"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { KpiCard } from "@/components/kpi-card";
import { StatusPill } from "@/components/status-pill";
import { MarketPulse } from "@/components/market-pulse";
import { IndustryNews } from "@/components/industry-news";
import { CategoryDemandWidget } from "@/components/category-demand";
import { formatMoneyCompact, formatRelative } from "@/lib/format";
import { poStageTone } from "@/lib/status";
import { useAuth } from "@/lib/auth-context";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { ChainVerification, Event, PurchaseOrder, Rfq, SupplierHistory } from "@/lib/types";

export default function DashboardPage() {
  const { session } = useAuth();
  if (session?.user.role === "SUPPLIER_USER") return <SupplierDashboard />;
  return <BuyerDashboard />;
}

function BuyerDashboard() {
  const { session } = useAuth();
  const api = useAuthedApi();
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[] | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [quotesAwaiting, setQuotesAwaiting] = useState(0);

  useEffect(() => {
    api.get<Rfq[]>("/rfqs").then(setRfqs);
    api.get<PurchaseOrder[]>("/purchase-orders").then(setPos);
    api.get<{ events: Event[]; chain: ChainVerification }>("/events").then((r) => setEvents(r.events));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rfqs) return;
    const open = rfqs.filter((r) => r.status === "OPEN");
    Promise.all(open.map((r) => api.get<unknown[]>(`/rfqs/${r.id}/quotes`).catch(() => []))).then((lists) =>
      setQuotesAwaiting(lists.reduce((sum, l) => sum + l.length, 0)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqs]);

  if (!rfqs || !pos || !events) return <p className="text-ink/50">Loading…</p>;

  const openCount = rfqs.filter((r) => r.status === "OPEN").length;
  const activePos = pos.filter((p) => p.stage !== "PAID").length;
  const committedSpend = pos.reduce((sum, p) => sum + parseFloat(p.totalValue), 0);
  const latestEvents = [...events].reverse().slice(0, 6);
  const rfqTitleById = new Map(rfqs.map((r) => [r.id, r.title]));

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Procurement overview</h1>
      <p className="mb-6 font-mono text-[11px] text-ink/45">{session?.organization.name.toUpperCase()}</p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Open RFQs" value={String(openCount)} note={`${rfqs.length} total`} />
        <KpiCard
          label="Quotes awaiting evaluation"
          value={String(quotesAwaiting)}
          note={quotesAwaiting > 0 ? "Needs your review" : undefined}
          noteTone="gold"
          accent={quotesAwaiting > 0}
        />
        <KpiCard label="Active POs" value={String(activePos)} note={`${pos.length} total`} />
        <KpiCard label="Committed spend" value={formatMoneyCompact(committedSpend)} noteTone="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-ink">PO pipeline</h2>
            <Link href="/pos" className="font-mono text-[11px] font-semibold text-amber-deep">
              All POs →
            </Link>
          </div>
          <div className="space-y-1">
            {pos.slice(0, 6).map((po) => (
              <Link
                key={po.id}
                href={`/pos/${po.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-row"
              >
                <span className="font-mono font-semibold text-ink">{po.poNumber}</span>
                <span className="flex-1 truncate px-3 text-ink/70">{rfqTitleById.get(po.rfqId) ?? "—"}</span>
                <StatusPill label={po.stage} tone={poStageTone(po.stage)} />
                <span className="ml-3 font-mono font-semibold text-ink">{formatMoneyCompact(po.totalValue)}</span>
              </Link>
            ))}
            {pos.length === 0 && <p className="px-2 py-3 text-[13px] text-ink/40">No purchase orders yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-ink">Latest events</h2>
            <Link href="/events" className="font-mono text-[11px] font-semibold text-amber-deep">
              Event log →
            </Link>
          </div>
          <div className="space-y-3">
            {latestEvents.map((e) => (
              <div key={e.id} className="flex items-start justify-between text-[12.5px]">
                <div>
                  <p className="font-mono font-semibold text-amber-deep">{e.type}</p>
                  <p className="text-ink/70">{e.note}</p>
                </div>
                <span className="whitespace-nowrap font-mono text-[10.5px] text-ink/35">
                  {formatRelative(e.createdAt)}
                </span>
              </div>
            ))}
            {latestEvents.length === 0 && <p className="text-[13px] text-ink/40">No activity yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MarketPulse />
        <IndustryNews />
      </div>
      <div className="mt-4">
        <CategoryDemandWidget />
      </div>
    </div>
  );
}

function SupplierDashboard() {
  const { session } = useAuth();
  const api = useAuthedApi();
  const [history, setHistory] = useState<SupplierHistory | null>(null);
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);

  useEffect(() => {
    api.get<SupplierHistory>("/suppliers/me/history").then(setHistory);
    api.get<Rfq[]>("/rfqs").then(setRfqs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!history || !rfqs) return <p className="text-ink/50">Loading…</p>;

  const pending = rfqs.filter((r) => r.status === "OPEN" && !r.myQuoteTotal);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Supplier overview</h1>
      <p className="mb-6 font-mono text-[11px] text-ink/45">
        {session?.organization.name.toUpperCase()} · SCORE {history.score ?? "UNRATED"}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="SourceOS score" value={history.score !== null ? String(history.score) : "UNRATED"} />
        <KpiCard label="Win rate" value={`${history.winRate}%`} note={`${history.rfqsWon}/${history.quotesSubmitted} quotes`} />
        <KpiCard label="On-time rate" value={history.onTimeRate !== null ? `${history.onTimeRate}%` : "UNRATED"} />
        <KpiCard label="Revenue via hub" value={formatMoneyCompact(history.totalRevenuePaid)} noteTone="green" />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-ink">RFQs awaiting your quote</h2>
          <Link href="/rfqs" className="font-mono text-[11px] font-semibold text-amber-deep">
            RFQ inbox →
          </Link>
        </div>
        <div className="space-y-1">
          {pending.map((r) => (
            <Link key={r.id} href={`/rfqs/${r.id}`} className="block rounded-md px-2 py-2 text-[13px] hover:bg-row">
              <span className="font-semibold text-ink">{r.title}</span>
              <span className="ml-2 text-ink/45">{r.items.length} line items</span>
            </Link>
          ))}
          {pending.length === 0 && <p className="px-2 py-3 text-[13px] text-ink/40">Nothing pending — all caught up.</p>}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MarketPulse />
        <IndustryNews />
      </div>
      <div className="mt-4">
        <CategoryDemandWidget />
      </div>
    </div>
  );
}
