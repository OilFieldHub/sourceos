"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { Btn } from "@/components/buttons";
import { formatDate } from "@/lib/format";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Organization } from "@/lib/types";

export default function VerificationQueuePage() {
  const api = useAuthedApi();
  const [pending, setPending] = useState<Organization[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    setPending(await api.get<Organization[]>("/organizations/pending"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: "verify" | "reject") {
    setBusy(id);
    try {
      await api.post(`/organizations/${id}/${action}`);
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (!pending) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold text-ink">Verification queue</h1>
      <p className="mb-6 text-[13px] text-muted">
        Organizations awaiting KYB verification. Only verified organizations show a "Verified" badge on the public
        supplier directory.
      </p>

      <div className="space-y-3">
        {pending.map((org) => (
          <Card key={org.id} className="flex items-center justify-between">
            <div>
              <p className="font-bold text-ink">{org.name}</p>
              <p className="font-mono text-[11px] text-muted">
                {org.type} · {org.country ?? "Country not set"} · registered {formatDate(org.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Btn variant="outline-red" disabled={busy === org.id} onClick={() => act(org.id, "reject")}>
                Reject
              </Btn>
              <Btn variant="success" disabled={busy === org.id} onClick={() => act(org.id, "verify")}>
                Verify
              </Btn>
            </div>
          </Card>
        ))}
        {pending.length === 0 && (
          <Card>
            <p className="text-[13px] text-muted">No organizations awaiting verification.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
