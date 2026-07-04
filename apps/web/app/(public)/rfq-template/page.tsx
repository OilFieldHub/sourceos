import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { RFQ_TEMPLATES } from "@/lib/static-content";

export const metadata: Metadata = {
  title: "RFQ Templates | OilfieldHub",
  description: "Starting-point RFQ templates for common oil & gas procurement categories.",
  alternates: { canonical: "/rfq-template" },
};

export default function RfqTemplatesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHero
        eyebrow="Sourcing toolkit"
        title="RFQ templates"
        subtitle="Starting points for common procurement categories, tuned to how SourceOS scores incoming quotes."
        photoSrc="/images/field-inspection.png"
        photoAlt="An OilfieldHub field inspector recording inspection results on site"
      />
      <div className="space-y-3">
        {RFQ_TEMPLATES.map((t) => (
          <Link
            key={t.slug}
            href={`/rfq-template/${t.slug}`}
            className="block rounded-2xl border border-hairline bg-panel p-5 shadow-[0_1px_2px_rgba(13,43,30,0.04)] transition hover:border-brand/40 hover:shadow-[0_12px_28px_-14px_rgba(13,43,30,0.18)]"
          >
            <h2 className="mb-1 font-bold text-ink">{t.title}</h2>
            <p className="text-[13px] text-muted">{t.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
