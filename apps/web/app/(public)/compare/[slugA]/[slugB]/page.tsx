import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import { publicApiGet } from "@/lib/public-api";
import type { PublicSupplierSummary } from "@/lib/types";

interface Params {
  params: Promise<{ slugA: string; slugB: string }>;
}

async function getComparison(slugA: string, slugB: string) {
  return publicApiGet<{ a: PublicSupplierSummary; b: PublicSupplierSummary }>(`/public/compare/${slugA}/${slugB}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slugA, slugB } = await params;
  const comparison = await getComparison(slugA, slugB);
  if (!comparison) return {};
  return {
    title: `${comparison.a.displayName} vs ${comparison.b.displayName} | OilfieldHub`,
    description: `Compare ${comparison.a.displayName} and ${comparison.b.displayName} on SourceOS score, clean-completion rate, and risk.`,
    alternates: { canonical: `/compare/${slugA}/${slugB}` },
  };
}

const ROWS: { label: string; get: (s: PublicSupplierSummary) => string }[] = [
  { label: "Clean completion", get: (s) => (s.onTimeRate !== null ? `${s.onTimeRate}%` : "—") },
  { label: "Completed contracts", get: (s) => String(s.completedContracts) },
  { label: "Risk", get: (s) => s.riskLevel ?? "UNRATED" },
];

export default async function ComparePage({ params }: Params) {
  const { slugA, slugB } = await params;
  const comparison = await getComparison(slugA, slugB);
  if (!comparison) notFound();
  const { a, b } = comparison;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">
        {a.displayName} vs {b.displayName}
      </h1>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-panel shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-hairline bg-row text-left font-mono text-[10.5px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3"></th>
              <th className="px-5 py-3">
                <Link href={`/suppliers/${a.slug}`} className="hover:text-brand-dark">
                  {a.displayName}
                </Link>
              </th>
              <th className="px-5 py-3">
                <Link href={`/suppliers/${b.slug}`} className="hover:text-brand-dark">
                  {b.displayName}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-hairline">
              <td className="px-5 py-3 font-semibold text-muted">Score</td>
              <td className="px-5 py-3">
                <ScoreBadge score={a.score} size="sm" />
              </td>
              <td className="px-5 py-3">
                <ScoreBadge score={b.score} size="sm" />
              </td>
            </tr>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-hairline">
                <td className="px-5 py-3 font-semibold text-muted">{row.label}</td>
                <td className="px-5 py-3 font-mono text-ink">{row.get(a)}</td>
                <td className="px-5 py-3 font-mono text-ink">{row.get(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
