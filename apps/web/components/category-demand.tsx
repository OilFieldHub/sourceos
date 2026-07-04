"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { useAuthedApi } from "@/lib/use-authed-api";

interface CategoryDemand {
  preset: string;
  label: string;
  rfqCount: number;
  buyerOrgCount: number;
}

/** Cross-buyer network effect: platform-wide demand per category, not scoped to the viewer's own organization. */
export function CategoryDemandWidget() {
  const api = useAuthedApi();
  const [demand, setDemand] = useState<CategoryDemand[] | null>(null);

  useEffect(() => {
    api
      .get<CategoryDemand[]>("/suppliers/category-demand")
      .then(setDemand)
      .catch(() => setDemand([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!demand) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-ink">Platform demand</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Last 90 days · all buyers</span>
      </div>
      <div className="space-y-2">
        {demand.map((d) => (
          <div key={d.preset} className="flex items-center justify-between rounded-lg bg-row px-3 py-2.5">
            <span className="text-[12.5px] font-semibold text-ink">{d.label}</span>
            <span className="font-mono text-[11.5px] text-muted">
              <span className="font-bold text-brand-dark">{d.rfqCount}</span> RFQ{d.rfqCount === 1 ? "" : "s"} ·{" "}
              <span className="font-bold text-brand-dark">{d.buyerOrgCount}</span> buyer
              {d.buyerOrgCount === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
