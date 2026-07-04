"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { StatusPill } from "@/components/status-pill";
import { ScoreBar } from "@/components/score-bar";
import { Btn } from "@/components/buttons";
import { TextInput } from "@/components/text-input";
import { SourceOSMark } from "@/components/sourceos-mark";
import { ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { rfqStatusTone } from "@/lib/status";
import { useAuth } from "@/lib/auth-context";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Evaluation, PurchaseOrder, Quotation, Rfq } from "@/lib/types";

export default function RfqDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  if (session?.user.role === "SUPPLIER_USER") return <SupplierRfqDetail rfqId={params.id} />;
  return <BuyerRfqDetail rfqId={params.id} />;
}

function BuyerRfqDetail({ rfqId }: { rfqId: string }) {
  const api = useAuthedApi();
  const router = useRouter();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const r = await api.get<Rfq>(`/rfqs/${rfqId}`);
    setRfq(r);
    if (r.status !== "DRAFT") {
      const [q, evals] = await Promise.all([
        api.get<Quotation[]>(`/rfqs/${rfqId}/quotes`),
        api.get<Evaluation[]>(`/rfqs/${rfqId}/evaluations`),
      ]);
      setQuotes(q);
      setEvaluations(evals);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  async function onEvaluate() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/rfqs/${rfqId}/evaluate`);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to evaluate");
    } finally {
      setBusy(false);
    }
  }

  async function onAward(supplierId: string) {
    setBusy(true);
    setError(null);
    try {
      const po = await api.post<PurchaseOrder>(`/rfqs/${rfqId}/award`, { supplierId });
      router.push(`/pos/${po.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to award");
      setBusy(false);
    }
  }

  if (!rfq) return <p className="text-ink/50">Loading…</p>;

  const supplierById = new Map(rfq.invitedSuppliers.map((s) => [s.id, s]));

  return (
    <div>
      <Link href="/rfqs" className="mb-3 inline-block font-mono text-[12px] text-ink/50">
        ← RFQs
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-[13px] font-bold text-brand-dark">{rfq.rfqNumber}</span>
        <h1 className="text-xl font-extrabold text-ink">{rfq.title}</h1>
        <StatusPill label={rfq.status} tone={rfqStatusTone(rfq.status)} />
      </div>

      {error && <p className="mb-4 rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-deep">{error}</p>}

      {quotes.length > 0 && (
        <Card className="mb-6 overflow-x-auto p-0">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-[13.5px] font-bold text-ink">
              Quote comparison — {rfq.items.length} line items · {quotes.length} suppliers
            </h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/40">
                <th className="px-5 py-2">Line item</th>
                {quotes.map((q) => (
                  <th key={q.id} className="px-5 py-2">
                    {supplierById.get(q.supplierId)?.displayName ?? q.supplierId.slice(0, 8)}
                    {evaluations.find((e) => e.supplierId === q.supplierId)?.anomalyFlag && (
                      <span
                        className="ml-1 text-red"
                        title={evaluations.find((e) => e.supplierId === q.supplierId)?.anomalyDetail ?? ""}
                      >
                        ⚠
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfq.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-5 py-2.5 text-ink/80">{item.description}</td>
                  {quotes.map((q) => {
                    const line = q.items.find((l) => l.rfqItemId === item.id);
                    return (
                      <td key={q.id} className="px-5 py-2.5 font-mono text-ink">
                        {line ? formatMoney(line.unitPrice) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-line font-bold">
                <td className="px-5 py-2.5 text-ink">TOTAL (evaluated)</td>
                {quotes.map((q) => (
                  <td key={q.id} className="px-5 py-2.5 font-mono text-ink">
                    {formatMoney(q.totalAmount)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {rfq.status === "OPEN" && (
        <div className="mb-6">
          <Btn onClick={onEvaluate} disabled={busy || quotes.length === 0}>
            {busy ? (
              "Evaluating…"
            ) : (
              <>
                Run <SourceOSMark /> evaluation
              </>
            )}
          </Btn>
          {quotes.length === 0 && <p className="mt-2 text-[12px] text-ink/40">Waiting on supplier quotes.</p>}
        </div>
      )}

      {evaluations.length > 0 && rfq.weightsLocked && (
        <>
          <h2 className="mb-1 text-[15px] font-bold text-ink">
            <SourceOSMark /> evaluation
          </h2>
          <p className="mb-4 font-mono text-[11px] text-ink/45">
            WEIGHTS LOCKED AT PUBLISH · CATEGORY PRESET: {rfq.categoryPreset.replaceAll("_", " ")} — PRICE{" "}
            {rfq.weightsLocked.price} · RELIABILITY {rfq.weightsLocked.reliability} · RISK {rfq.weightsLocked.risk}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...evaluations]
              .sort((a, b) => a.rank - b.rank)
              .map((ev) => {
                const isRank1 = ev.rank === 1;
                return (
                  <Card
                    key={ev.id}
                    className={isRank1 ? "border-[1.5px] border-brand shadow-[0_4px_20px_-6px_rgba(15,122,70,0.35)]" : ""}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isRank1 ? "bg-brand text-white" : "bg-sand text-muted"
                        }`}
                      >
                        RANK {ev.rank}
                      </span>
                    </div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-bold text-ink">
                        {supplierById.get(ev.supplierId)?.displayName ?? ev.supplierId.slice(0, 8)}
                      </span>
                      <span className="font-mono text-[19px] font-extrabold text-ink">{ev.compositeScore}</span>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label="Price" value={parseFloat(ev.priceScore)} tone="ink" />
                      <ScoreBar label="Reliability" value={parseFloat(ev.reliabilityScore)} tone="green" />
                      <ScoreBar label="Risk" value={parseFloat(ev.riskScore)} tone="risk" />
                    </div>
                    <ul className="mt-3 space-y-1 text-[11.5px] text-ink/65">
                      {ev.reasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                    {ev.anomalyFlag && (
                      <p className="mt-3 rounded-md border border-red-border bg-red-bg px-2.5 py-2 text-[11.5px] text-red-deep">
                        ⚠ {ev.anomalyDetail}
                      </p>
                    )}
                    {isRank1 && rfq.status === "EVALUATION" && (
                      <Btn className="mt-4 w-full" onClick={() => onAward(ev.supplierId)} disabled={busy}>
                        Award &amp; generate PO →
                      </Btn>
                    )}
                  </Card>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

function SupplierRfqDetail({ rfqId }: { rfqId: string }) {
  const api = useAuthedApi();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [myQuote, setMyQuote] = useState<Quotation | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Rfq>(`/rfqs/${rfqId}`).then(setRfq);
    api.get<Quotation | null>(`/rfqs/${rfqId}/my-quote`).then(setMyQuote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  if (!rfq) return <p className="text-ink/50">Loading…</p>;

  const total = rfq.items.reduce((sum, item) => {
    const price = parseFloat(prices[item.id] ?? "0") || 0;
    return sum + price * parseFloat(item.quantity);
  }, 0);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const items = rfq!.items.map((item) => ({ rfqItemId: item.id, unitPrice: parseFloat(prices[item.id] ?? "0") }));
      const q = await api.post<Quotation>(`/rfqs/${rfqId}/quotes`, { items });
      setMyQuote(q);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit quote");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/rfqs" className="mb-3 inline-block font-mono text-[12px] text-ink/50">
        ← RFQ inbox
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-[13px] font-bold text-brand-dark">{rfq.rfqNumber}</span>
        <h1 className="text-xl font-extrabold text-ink">{rfq.title}</h1>
        <StatusPill label={rfq.status} tone={rfqStatusTone(rfq.status)} />
      </div>

      {myQuote ? (
        <Card>
          <p className="mb-4 rounded-md bg-green-bg px-3 py-2 text-[13px] font-semibold text-green-deep">
            ✓ Quote submitted — {formatMoney(myQuote.totalAmount)}
          </p>
          <table className="w-full text-[13px]">
            <tbody>
              {rfq.items.map((item) => {
                const line = myQuote.items.find((l) => l.rfqItemId === item.id);
                return (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-2 text-ink/70">{item.description}</td>
                    <td className="py-2 text-right font-mono text-ink">
                      {line ? formatMoney(line.unitPrice) : "—"}
                    </td>
                    <td className="py-2 pl-4 text-right font-mono font-semibold text-ink">
                      {line ? formatMoney(line.lineTotal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-3 text-[13.5px] font-bold text-ink">Submit quote</h2>
          <div className="space-y-2">
            {rfq.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_120px] items-center gap-3">
                <span className="text-[13px] text-ink/70">
                  {item.description} <span className="text-ink/40">({item.quantity} {item.unit})</span>
                </span>
                <TextInput
                  inputMode="decimal"
                  placeholder="Unit price"
                  value={prices[item.id] ?? ""}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="py-1.5 text-right font-mono"
                />
                <span className="text-right font-mono text-[13px] text-ink/60">
                  {formatMoney((parseFloat(prices[item.id] ?? "0") || 0) * parseFloat(item.quantity))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="font-mono text-[20px] font-extrabold text-ink">{formatMoney(total)}</span>
            <Btn onClick={onSubmit} disabled={busy || rfq.status !== "OPEN"}>
              {busy ? "Submitting…" : "Submit quote"}
            </Btn>
          </div>
          {error && <p className="mt-3 rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-deep">{error}</p>}
        </Card>
      )}
    </div>
  );
}
