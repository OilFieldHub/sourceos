"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { StatusPill } from "@/components/status-pill";
import { PoStepper } from "@/components/po-stepper";
import { DocumentFiling } from "@/components/document-filing";
import { Btn } from "@/components/buttons";
import { TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api-client";
import { formatDateTime, formatMoney } from "@/lib/format";
import { disputeTone } from "@/lib/status";
import { useAuth } from "@/lib/auth-context";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Grn, Inspection, Invoice, Payment, PurchaseOrder, Quotation, Rfq } from "@/lib/types";

interface Fulfillment {
  grn: Grn | null;
  inspection: Inspection | null;
  invoice: Invoice | null;
  payment: Payment | null;
}

export default function PoDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const api = useAuthedApi();
  const role = session?.user.role;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [p, f] = await Promise.all([
      api.get<PurchaseOrder>(`/purchase-orders/${params.id}`),
      api.get<Fulfillment>(`/purchase-orders/${params.id}/fulfillment`),
    ]);
    setPo(p);
    setFulfillment(f);

    if (role !== "ADMIN") {
      const r = await api.get<Rfq>(`/rfqs/${p.rfqId}`);
      setRfq(r);
      if (role === "SUPPLIER_USER") {
        setQuote(await api.get<Quotation | null>(`/rfqs/${p.rfqId}/my-quote`));
      } else {
        const quotes = await api.get<Quotation[]>(`/rfqs/${p.rfqId}/quotes`);
        setQuote(quotes.find((q) => q.supplierId === p.supplierId) ?? null);
      }
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!po || !fulfillment) return <p className="text-ink/50">Loading…</p>;

  const itemsById = new Map(rfq?.items.map((i) => [i.id, i]) ?? []);
  const isBuyer = role === "BUYER_ADMIN" || role === "BUYER_USER";
  const isBuyerAdmin = role === "BUYER_ADMIN";
  const isSupplier = role === "SUPPLIER_USER";
  const isAdmin = role === "ADMIN";
  const needsApproval = po.requiresApproval && !po.approvedById;

  return (
    <div>
      <Link href="/pos" className="mb-3 inline-block font-mono text-[12px] text-ink/50">
        ← POs
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-ink">
            {po.poNumber} {rfq && <span className="font-normal text-ink/60">· {rfq.title}</span>}
          </h1>
        </div>
        <span className="font-mono text-lg font-extrabold text-ink">{formatMoney(po.totalValue)}</span>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-deep">{error}</p>}

      <Card className="mb-6">
        <PoStepper stage={po.stage} />
      </Card>

      {needsApproval && (
        <Card className="mb-4 border-amber-border bg-amber-bg">
          <p className="mb-2 text-[13px] font-semibold text-amber-deep">
            ⚠ This PO exceeds $250,000 and requires segregation-of-duties approval before it can proceed.
          </p>
          {isBuyerAdmin && (
            <Btn variant="dark" disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/approve`))}>
              Approve PO
            </Btn>
          )}
        </Card>
      )}

      {!needsApproval && (
        <Card className={`mb-4 ${po.escrowFunded ? "bg-amber-bg" : ""} border-amber-border`}>
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-ink/80">
              {po.escrowFunded
                ? "○ Escrow funded ✓ — milestone funds release on payment stage · immutable audit trail in Event Log"
                : "Escrow not yet funded"}
            </p>
            {isBuyer && po.stage === "ISSUED" && !po.escrowFunded && (
              <Btn variant="dark" disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/fund-escrow`))}>
                Fund escrow
              </Btn>
            )}
          </div>
        </Card>
      )}

      {!needsApproval && (
        <Card className="mb-6">
          <StageAction
            po={po}
            fulfillment={fulfillment}
            rfq={rfq}
            isBuyer={isBuyer}
            isSupplier={isSupplier}
            busy={busy}
            act={act}
            api={api}
          />
        </Card>
      )}

      {po.disputeStatus !== "NONE" || (isBuyer && ["GRN_RECEIVED", "INSPECTED", "INVOICED"].includes(po.stage)) ? (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">Dispute</span>
              <StatusPill label={po.disputeStatus} tone={disputeTone(po.disputeStatus)} />
            </div>
            {isBuyer && po.disputeStatus === "NONE" && ["GRN_RECEIVED", "INSPECTED", "INVOICED"].includes(po.stage) && (
              <Btn
                variant="outline-red"
                disabled={busy}
                onClick={() => act(() => api.post(`/purchase-orders/${po.id}/dispute`, {}))}
              >
                ⚠ Raise dispute
              </Btn>
            )}
            {isAdmin && po.disputeStatus === "OPEN" && (
              <Btn variant="dark" disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/dispute/mediate`))}>
                Move to mediation
              </Btn>
            )}
            {isAdmin && po.disputeStatus === "MEDIATION" && (
              <Btn variant="success" disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/dispute/resolve`))}>
                Resolve dispute
              </Btn>
            )}
          </div>
        </Card>
      ) : null}

      {fulfillment.grn && (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-ink">GRN · {fulfillment.grn.grnNumber}</h2>
            <StatusPill label={fulfillment.grn.status} tone={fulfillment.grn.status === "FULL" ? "green" : "amber"} />
          </div>
          <p className="mb-2 text-[12px] text-ink/45">Received {formatDateTime(fulfillment.grn.receivedAt)}</p>
          <div className="space-y-1">
            {fulfillment.grn.lines.map((line) => (
              <div key={line.rfqItemId} className="flex items-center justify-between text-[13px]">
                <span className="text-ink/70">{itemsById.get(line.rfqItemId)?.description ?? line.rfqItemId}</span>
                <span className={`font-mono ${line.qtyOk ? "text-safe-dark" : "text-red"}`}>
                  {line.receivedQty} received {line.qtyOk ? "✓" : "⚠"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {fulfillment.inspection && (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-ink">Inspection · {fulfillment.inspection.reportId}</h2>
            <StatusPill
              label={fulfillment.inspection.result}
              tone={fulfillment.inspection.result === "PASSED" ? "green" : "red"}
            />
          </div>
          <div className="flex gap-4 text-[13px] text-ink/70">
            <span>{fulfillment.inspection.conditionCheck ? "✓" : "✕"} Condition</span>
            <span>{fulfillment.inspection.certsCheck ? "✓" : "✕"} Certs</span>
            <span>{fulfillment.inspection.quantityCheck ? "✓" : "✕"} Quantity</span>
          </div>
        </Card>
      )}

      {fulfillment.invoice && (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-ink">Invoice · {fulfillment.invoice.invoiceNumber}</h2>
            <StatusPill label={fulfillment.invoice.status} tone={fulfillment.invoice.status === "MATCHED" ? "green" : "amber"} />
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-ink/40">
                <th className="py-1">Line</th>
                <th className="py-1 text-right">PO qty</th>
                <th className="py-1 text-right">GRN qty</th>
                <th className="py-1 text-right">Invoice qty</th>
                <th className="py-1 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {fulfillment.invoice.threeWayMatch.map((l) => (
                <tr key={l.rfqItemId} className="border-t border-line">
                  <td className="py-1.5 text-ink/70">{itemsById.get(l.rfqItemId)?.description ?? l.rfqItemId}</td>
                  <td className="py-1.5 text-right font-mono">{l.poQty}</td>
                  <td className="py-1.5 text-right font-mono">{l.grnQty}</td>
                  <td className="py-1.5 text-right font-mono">{l.invoiceQty}</td>
                  <td className="py-1.5 text-right">{l.matched ? "✓ MATCH" : "⚠ MISMATCH"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {fulfillment.payment && (
        <Card className="mb-4 bg-green-bg">
          <p className="text-[13px] font-semibold text-green-deep">
            ✓ {fulfillment.payment.paymentNumber} paid {formatMoney(fulfillment.payment.amount)} · released{" "}
            {formatDateTime(fulfillment.payment.releasedAt)}
          </p>
        </Card>
      )}

      <DocumentFiling entityType="PurchaseOrder" entityId={po.id} />

      {quote && (
        <Card>
          <h2 className="mb-3 text-[13.5px] font-bold text-ink">
            Supplier {rfq && `· ${rfq.invitedSuppliers.find((s) => s.id === po.supplierId)?.displayName ?? ""}`}
          </h2>
          <div className="space-y-1">
            {quote.items.map((line) => (
              <div key={line.id} className="flex items-center justify-between text-[13px]">
                <span className="text-ink/70">{itemsById.get(line.rfqItemId)?.description ?? line.rfqItemId}</span>
                <span className="font-mono font-semibold text-ink">{formatMoney(line.lineTotal)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StageAction({
  po,
  fulfillment,
  rfq,
  isBuyer,
  isSupplier,
  busy,
  act,
  api,
}: {
  po: PurchaseOrder;
  fulfillment: Fulfillment;
  rfq: Rfq | null;
  isBuyer: boolean;
  isSupplier: boolean;
  busy: boolean;
  act: <T>(fn: () => Promise<T>) => Promise<void>;
  api: ReturnType<typeof useAuthedApi>;
}) {
  const [grnQty, setGrnQty] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState({ conditionCheck: true, certsCheck: true, quantityCheck: true });

  // partial GRN or failed inspection or mismatched invoice: hold + resolve action
  const grnException = po.stage === "ACKNOWLEDGED" && fulfillment.grn?.status === "PARTIAL";
  const inspectionException = po.stage === "GRN_RECEIVED" && fulfillment.inspection?.result === "FAILED";
  const invoiceException = po.stage === "INSPECTED" && fulfillment.invoice && fulfillment.invoice.status !== "MATCHED";

  if (grnException || inspectionException || invoiceException) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-red-deep">
          ⚠ Exception open — lifecycle held. Escrow untouched until resolved.
        </p>
        {isBuyer && (
          <Btn
            variant="outline-red"
            disabled={busy}
            onClick={() => act(() => api.post(`/purchase-orders/${po.id}/resolve-exception`))}
          >
            Resolve exception
          </Btn>
        )}
      </div>
    );
  }

  if (po.stage === "ISSUED") {
    if (isSupplier) {
      return (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink/60">Awaiting your acknowledgement.</p>
          <Btn disabled={busy || !po.escrowFunded} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/acknowledge`))}>
            Acknowledge PO
          </Btn>
        </div>
      );
    }
    return <p className="text-[13px] text-ink/60">Waiting on supplier acknowledgement.</p>;
  }

  if (po.stage === "ACKNOWLEDGED") {
    if (!isBuyer || !rfq) return <p className="text-[13px] text-ink/60">Awaiting goods receipt.</p>;
    return (
      <div>
        <h2 className="mb-3 text-[13.5px] font-bold text-ink">Record GRN</h2>
        <div className="space-y-2">
          {rfq.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_120px] items-center gap-3">
              <span className="text-[13px] text-ink/70">
                {item.description} <span className="text-ink/40">(ordered {item.quantity})</span>
              </span>
              <TextInput
                inputMode="decimal"
                placeholder="Qty received"
                value={grnQty[item.id] ?? ""}
                onChange={(e) => setGrnQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="py-1.5 text-right font-mono"
              />
            </div>
          ))}
        </div>
        <Btn
          className="mt-3"
          disabled={busy}
          onClick={() =>
            act(() =>
              api.post(`/purchase-orders/${po.id}/grn`, {
                lines: rfq.items.map((item) => ({ rfqItemId: item.id, receivedQty: Number(grnQty[item.id] ?? 0) })),
              }),
            )
          }
        >
          Submit GRN
        </Btn>
      </div>
    );
  }

  if (po.stage === "GRN_RECEIVED") {
    if (!isBuyer) return <p className="text-[13px] text-ink/60">Awaiting inspection.</p>;
    return (
      <div>
        <h2 className="mb-3 text-[13.5px] font-bold text-ink">Inspection checklist</h2>
        <div className="mb-3 flex gap-4 text-[13px]">
          {(["conditionCheck", "certsCheck", "quantityCheck"] as const).map((key) => (
            <label key={key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={checks[key]}
                onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {key === "conditionCheck" ? "Condition" : key === "certsCheck" ? "Certs" : "Quantity"}
            </label>
          ))}
        </div>
        <Btn disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/inspection`, checks))}>
          Submit inspection
        </Btn>
      </div>
    );
  }

  if (po.stage === "INSPECTED") {
    if (isSupplier) {
      return (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink/60">Inspection passed — ready to invoice.</p>
          <Btn disabled={busy} onClick={() => act(() => api.post(`/purchase-orders/${po.id}/invoice`))}>
            Submit invoice
          </Btn>
        </div>
      );
    }
    return <p className="text-[13px] text-ink/60">Awaiting supplier invoice.</p>;
  }

  if (po.stage === "INVOICED") {
    if (isBuyer) {
      const blocked = po.disputeStatus === "OPEN" || po.disputeStatus === "MEDIATION";
      return (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink/60">3-way match complete — ready to release payment.</p>
          <Btn
            variant="success"
            disabled={busy || blocked}
            onClick={() => act(() => api.post(`/purchase-orders/${po.id}/release-payment`))}
          >
            Release payment
          </Btn>
        </div>
      );
    }
    return <p className="text-[13px] text-ink/60">Awaiting payment release.</p>;
  }

  return <p className="text-[13px] font-semibold text-green-deep">✓ Lifecycle complete — paid in full.</p>;
}
