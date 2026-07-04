import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { publicApiGet } from "@/lib/public-api";
import type { PublicCategorySummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Procurement Categories | OilfieldHub",
  description: "Browse oil & gas procurement categories on OilfieldHub.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesIndexPage() {
  const categories = (await publicApiGet<PublicCategorySummary[]>("/public/categories")) ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHero
        eyebrow="Browse by category"
        title="Procurement categories"
        subtitle="Find SourceOS-verified suppliers organized by the categories buyers source most across African oil & gas."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/categories/${c.slug}`}
            className="group flex items-center justify-between rounded-2xl border border-hairline bg-panel p-5 shadow-[0_1px_2px_rgba(13,43,30,0.04)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-14px_rgba(13,43,30,0.18)]"
          >
            <h2 className="font-bold text-ink group-hover:text-brand-dark">{c.label}</h2>
            <span className="rounded-full bg-mint px-3 py-1 font-mono text-[11.5px] font-bold text-brand-dark">
              {c.publishedSupplierCount}
            </span>
          </Link>
        ))}
        {categories.length === 0 && (
          <p className="col-span-2 rounded-2xl border border-dashed border-hairline p-8 text-center text-[13px] text-muted">
            No categories published yet.
          </p>
        )}
      </div>
    </div>
  );
}
