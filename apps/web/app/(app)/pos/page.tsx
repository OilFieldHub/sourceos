"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { StatusPill } from "@/components/status-pill";
import { formatMoney } from "@/lib/format";
import { poStageTone } from "@/lib/status";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { PurchaseOrder } from "@/lib/types";

export default function PosPage() {
  const api = useAuthedApi();
  const [pos, setPos] = useState<PurchaseOrder[] | null>(null);

  useEffect(() => {
    api.get<PurchaseOrder[]>("/purchase-orders").then(setPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pos) return <p className="text-ink/50">Loading…</p>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-ink">Purchase orders</h1>
      <Card className="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Dispute</th>
              <th className="px-4 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => (
              <tr key={po.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-row">
                <td className="px-4 py-3">
                  <Link href={`/pos/${po.id}`} className="font-mono font-semibold text-ink">
                    {po.poNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill label={po.stage} tone={poStageTone(po.stage)} />
                </td>
                <td className="px-4 py-3 text-ink/50">{po.disputeStatus !== "NONE" ? po.disputeStatus : "—"}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{formatMoney(po.totalValue)}</td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink/40">
                  No purchase orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
