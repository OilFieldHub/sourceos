import type { Metadata } from "next";
import Link from "next/link";
import { AssetTicker } from "@/components/asset-ticker";
import { PageHero } from "@/components/page-hero";
import { ScoreBadge, VerifiedBadge } from "@/components/score-badge";
import { SourceOSMark } from "@/components/sourceos-mark";
import { publicApiGet } from "@/lib/public-api";
import { SITE_URL } from "@/lib/site";
import type { PublicSupplierSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Verified Oil & Gas Suppliers | OilfieldHub",
  description: "Browse SourceOS-scored suppliers on OilfieldHub, the procurement operating system for African oil & gas.",
  alternates: { canonical: "/suppliers" },
};

export default async function SuppliersIndexPage() {
  const suppliers = (await publicApiGet<PublicSupplierSummary[]>("/public/suppliers")) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: suppliers.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/suppliers/${s.slug}`,
      name: s.displayName,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AssetTicker />
      <PageHero
        eyebrow={
          <>
            <SourceOSMark /> Verified Network
          </>
        }
        title="Verified oil & gas suppliers"
        subtitle="Ranked on delivery reliability, clean completion, and platform history — every score earned on real contracts, not self-reported."
        stat={{ value: String(suppliers.length), label: "Verified suppliers" }}
        photoSrc="/images/hero-staff.png"
        photoAlt="OilfieldHub staff completing a supplier inspection handoff at a Port Harcourt facility"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {suppliers.map((s) => (
          <Link
            key={s.slug}
            href={`/suppliers/${s.slug}`}
            className="group rounded-2xl border border-hairline bg-panel p-5 shadow-[0_1px_2px_rgba(13,43,30,0.04)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-14px_rgba(13,43,30,0.18)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink group-hover:text-brand-dark">{s.displayName}</h2>
                {s.kybVerified && (
                  <div className="mt-1.5">
                    <VerifiedBadge />
                  </div>
                )}
              </div>
              <ScoreBadge score={s.score} />
            </div>
            <p className="text-[12.5px] text-muted">
              {s.completedContracts} completed contract{s.completedContracts === 1 ? "" : "s"}
              {s.onTimeRate !== null ? ` · ${s.onTimeRate}% clean completion` : ""}
              {s.riskLevel ? ` · ${s.riskLevel} risk` : ""}
            </p>
          </Link>
        ))}
        {suppliers.length === 0 && (
          <p className="col-span-2 rounded-2xl border border-dashed border-hairline p-8 text-center text-[13px] text-muted">
            No suppliers have met the content-completeness threshold yet.
          </p>
        )}
      </div>
    </div>
  );
}
