"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { StatusPill } from "@/components/status-pill";
import { Btn } from "@/components/buttons";
import { formatDate, formatMoney } from "@/lib/format";
import { rfqStatusTone } from "@/lib/status";
import { useAuth } from "@/lib/auth-context";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Rfq } from "@/lib/types";

export default function RfqsPage() {
  const { session } = useAuth();
  if (session?.user.role === "SUPPLIER_USER") return <SupplierInbox />;
  return <BuyerRfqList />;
}

function BuyerRfqList() {
  const api = useAuthedApi();
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get<Rfq[]>("/rfqs").then(setRfqs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rfqs) return;
    Promise.all(
      rfqs.map((r) =>
        r.status === "DRAFT"
          ? Promise.resolve([])
          : api.get<unknown[]>(`/rfqs/${r.id}/quotes`).catch(() => []),
      ),
    ).then((lists) => {
      const map: Record<string, number> = {};
      rfqs.forEach((r, i) => (map[r.id] = lists[i].length));
      setQuoteCounts(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqs]);

  if (!rfqs) return <p className="text-ink/50">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink">RFQs</h1>
        <Link href="/rfqs/new">
          <Btn>+ New RFQ</Btn>
        </Link>
      </div>

      <Card className="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3">RFQ</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3">Closes</th>
            </tr>
          </thead>
          <tbody>
            {rfqs.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-row">
                <td className="px-4 py-3 font-mono font-semibold text-brand-dark">{r.rfqNumber}</td>
                <td className="px-4 py-3">
                  <Link href={`/rfqs/${r.id}`} className="font-semibold text-ink">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill label={r.status} tone={rfqStatusTone(r.status)} />
                </td>
                <td className="px-4 py-3 font-mono text-ink/70">{r.items.length}</td>
                <td className="px-4 py-3 font-mono text-ink/70">{quoteCounts[r.id] ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-ink/50">{formatDate(r.closeDate)}</td>
              </tr>
            ))}
            {rfqs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  No RFQs yet — create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SupplierInbox() {
  const { session } = useAuth();
  const api = useAuthedApi();
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);

  useEffect(() => {
    api.get<Rfq[]>("/rfqs").then(setRfqs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rfqs) return <p className="text-ink/50">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">RFQ inbox</h1>
      <p className="mb-6 font-mono text-[11px] text-ink/45">
        {session?.supplier?.displayName.toUpperCase()}
      </p>

      <div className="space-y-3">
        {rfqs.map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold text-brand-dark">{r.rfqNumber}</p>
              <Link href={`/rfqs/${r.id}`} className="font-bold text-ink hover:underline">
                {r.title}
              </Link>
              <p className="mt-1 text-[12px] text-ink/50">
                {r.items.length} line item{r.items.length === 1 ? "" : "s"} · closes {formatDate(r.closeDate)}
              </p>
            </div>
            {r.myQuoteTotal ? (
              <span className="rounded-full bg-green-bg px-3 py-1.5 text-[12px] font-semibold text-green-deep">
                ✓ QUOTE SUBMITTED — {formatMoney(r.myQuoteTotal)}
              </span>
            ) : (
              <Link href={`/rfqs/${r.id}`}>
                <Btn>Submit quote →</Btn>
              </Link>
            )}
          </Card>
        ))}
        {rfqs.length === 0 && <p className="text-[13px] text-ink/40">No RFQs invited yet.</p>}
      </div>
    </div>
  );
}
