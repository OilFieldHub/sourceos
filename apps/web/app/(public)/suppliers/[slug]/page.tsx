import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreBadge, VerifiedBadge } from "@/components/score-badge";
import { SourceOSMark } from "@/components/sourceos-mark";
import { publicApiGet } from "@/lib/public-api";
import type { PublicSupplierSummary } from "@/lib/types";

interface Params {
  params: Promise<{ slug: string }>;
}

async function getSupplier(slug: string) {
  return publicApiGet<PublicSupplierSummary>(`/public/suppliers/${slug}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  if (!supplier) return {};
  return {
    title: `${supplier.displayName} — SourceOS Profile | OilfieldHub`,
    description: `${supplier.displayName}: SourceOS score ${supplier.score ?? "UNRATED"}, ${supplier.completedContracts} completed contracts on OilfieldHub.`,
    alternates: {
      canonical: `/suppliers/${supplier.slug}`,
      languages: { en: `/suppliers/${supplier.slug}`, fr: `/fr/suppliers/${supplier.slug}`, pt: `/pt/suppliers/${supplier.slug}` },
    },
  };
}

export default async function SupplierDetailPage({ params }: Params) {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  if (!supplier) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: supplier.displayName,
    ...(supplier.score !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: supplier.score,
            bestRating: 100,
            worstRating: 0,
            ratingCount: supplier.completedContracts || 1,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/suppliers" className="mb-4 inline-block text-[12px] font-semibold text-muted hover:text-brand-dark">
        ← All suppliers
      </Link>

      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-deep to-brand px-8 py-8">
        {supplier.kybVerified && (
          <div className="mb-3">
            <VerifiedBadge />
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-white">{supplier.displayName}</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/60">
          <SourceOSMark /> {supplier.kybVerified ? "verified profile" : "profile"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-panel p-4 text-center shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-wide text-muted">Score</p>
          <ScoreBadge score={supplier.score} size="lg" />
        </div>
        <div className="rounded-2xl border border-hairline bg-panel p-4 text-center shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-wide text-muted">Clean completion</p>
          <p className="text-2xl font-extrabold text-ink">
            {supplier.onTimeRate !== null ? `${supplier.onTimeRate}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-panel p-4 text-center shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-wide text-muted">Risk</p>
          <p className="text-2xl font-extrabold text-ink">{supplier.riskLevel ?? "UNRATED"}</p>
        </div>
      </div>

      <p className="mt-6 text-[13.5px] text-muted">
        {supplier.completedContracts} completed contract{supplier.completedContracts === 1 ? "" : "s"} on OilfieldHub.
      </p>
    </div>
  );
}
