import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { SourceOSMark } from "@/components/sourceos-mark";
import { GUIDES } from "@/lib/static-content";

export const metadata: Metadata = {
  title: "Procurement Guides | OilfieldHub",
  description: "Guides to procurement and supplier evaluation on OilfieldHub.",
  alternates: { canonical: "/guide" },
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHero
        eyebrow={
          <>
            Learn <SourceOSMark />
          </>
        }
        title="Guides"
        subtitle="Understanding procurement, evaluation, and supplier scoring on OilfieldHub."
      />
      <div className="space-y-3">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            className="block rounded-2xl border border-hairline bg-panel p-5 shadow-[0_1px_2px_rgba(13,43,30,0.04)] transition hover:border-brand/40 hover:shadow-[0_12px_28px_-14px_rgba(13,43,30,0.18)]"
          >
            <h2 className="mb-1 font-bold text-ink">{g.title}</h2>
            <p className="text-[13px] text-muted">{g.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
