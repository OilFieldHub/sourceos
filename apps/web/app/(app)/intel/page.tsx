"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { SourceOSMark } from "@/components/sourceos-mark";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Supplier } from "@/lib/types";

function scoreColor(score: number | null): string {
  if (score === null) return "text-ink/40";
  if (score >= 85) return "text-safe-dark";
  if (score >= 75) return "text-amber-deep";
  return "text-red";
}

function riskColor(risk: string | null): string {
  if (risk === "LOW") return "text-safe-dark";
  if (risk === "MEDIUM") return "text-amber-deep";
  if (risk === "HIGH") return "text-red";
  return "text-ink/40";
}

export default function IntelPage() {
  const api = useAuthedApi();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);

  useEffect(() => {
    api.get<Supplier[]>("/suppliers").then(setSuppliers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!suppliers) return <p className="text-ink/50">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">
        <SourceOSMark /> intelligence
      </h1>
      <p className="mb-6 font-mono text-[11px] text-ink/45">
        SUPPLIER SCORING 0-100 · PRICE ANOMALY DETECTION (per RFQ evaluation) · EXPLAINABLE
      </p>

      <Card className="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3">Supplier</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">On-time</th>
              <th className="px-5 py-3">Disputes</th>
              <th className="px-5 py-3">Risk</th>
              <th className="px-5 py-3">Why this score</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0 align-top">
                <td className="px-5 py-3 font-semibold text-ink">{s.displayName}</td>
                <td className={`px-5 py-3 font-mono text-lg font-extrabold ${scoreColor(s.score)}`}>
                  {s.score ?? "NEW"}
                </td>
                <td className="px-5 py-3 font-mono text-ink/70">{s.onTimeRate !== null ? `${s.onTimeRate}%` : "—"}</td>
                <td className="px-5 py-3 font-mono text-ink/70">{s.riskLevel !== null ? s.disputesCount : "—"}</td>
                <td className={`px-5 py-3 font-mono text-[11px] font-bold uppercase ${riskColor(s.riskLevel)}`}>
                  {s.riskLevel ?? "UNRATED"}
                </td>
                <td className="px-5 py-3 text-ink/60">
                  {s.scoreDrivers && s.scoreDrivers.length > 0
                    ? s.scoreDrivers.join(" · ")
                    : "Cold-start protected: 0 completed contracts — shown as UNRATED (never a low number); evaluation treats missing reliability as neutral, not zero."}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-ink/40">
                  No suppliers registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
