"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { Btn } from "@/components/buttons";
import { FieldLabel, TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api-client";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { RfqCategoryPreset, Rfq, Supplier } from "@/lib/types";

interface DraftItem {
  description: string;
  quantity: string;
  unit: string;
}

export default function NewRfqPage() {
  const router = useRouter();
  const api = useAuthedApi();

  const [title, setTitle] = useState("");
  const [categoryPreset, setCategoryPreset] = useState<RfqCategoryPreset>("GENERAL_SUPPLY");
  const [closeDate, setCloseDate] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ description: "", quantity: "", unit: "" }]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => setSuppliers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validItems = items.filter((i) => i.description.trim().length > 0 && i.quantity && i.unit.trim().length > 0);
  const canSubmit = title.trim().length >= 3 && validItems.length >= 1 && invited.size >= 1 && !busy;

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function toggleSupplier(id: string) {
    setInvited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const rfq = await api.post<Rfq>("/rfqs", {
        title,
        categoryPreset,
        closeDate: closeDate ? new Date(closeDate).toISOString() : undefined,
        items: validItems.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit: i.unit })),
        invitedSupplierIds: [...invited],
      });
      await api.post(`/rfqs/${rfq.id}/publish`);
      router.push(`/rfqs/${rfq.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-ink">New RFQ</h1>

      <Card className="mb-5 space-y-4">
        <div>
          <FieldLabel>Title</FieldLabel>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Jack-up drilling campaign — OML 120"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Category preset</FieldLabel>
            <select
              value={categoryPreset}
              onChange={(e) => setCategoryPreset(e.target.value as RfqCategoryPreset)}
              className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-mint"
            >
              <option value="RIG_CHARTER">Rig charter (price 30 · reliability 30 · risk 40)</option>
              <option value="GENERAL_SUPPLY">General supply (price 40 · reliability 30 · risk 30)</option>
            </select>
          </div>
          <div>
            <FieldLabel>Close date</FieldLabel>
            <TextInput type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Line items</h2>
          <button
            onClick={() => setItems((prev) => [...prev, { description: "", quantity: "", unit: "" }])}
            className="font-mono text-[11px] font-semibold text-brand hover:text-brand-dark"
          >
            + Add row
          </button>
        </div>
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_100px_100px_28px]">
              <TextInput
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Description"
                className="py-1.5"
              />
              <TextInput
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
                placeholder="Qty"
                inputMode="decimal"
                className="py-1.5 text-right font-mono"
              />
              <TextInput
                value={item.unit}
                onChange={(e) => updateItem(i, { unit: e.target.value })}
                placeholder="Unit"
                className="py-1.5"
              />
              <button
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={items.length === 1}
                className="text-muted/50 transition hover:text-red disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 text-[14px] font-semibold text-ink">Invite suppliers</h2>
        <div className="flex flex-wrap gap-2">
          {suppliers.map((s) => {
            const active = invited.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSupplier(s.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                  active
                    ? "bg-brand text-white shadow-[0_2px_8px_-2px_rgba(15,122,70,0.5)]"
                    : "border border-hairline bg-panel text-muted hover:border-brand/30 hover:text-ink"
                }`}
              >
                {s.displayName} {s.score !== null ? `· ${s.score}` : "· UNRATED"}
              </button>
            );
          })}
          {suppliers.length === 0 && <p className="text-[13px] text-muted">No suppliers registered yet.</p>}
        </div>
      </Card>

      {error && <p className="mb-4 rounded-xl bg-red-bg px-3.5 py-2.5 text-[13px] text-red-deep">{error}</p>}

      <Btn onClick={onSubmit} disabled={!canSubmit}>
        {busy ? "Publishing…" : "Publish RFQ"}
      </Btn>
    </div>
  );
}
