import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import { publicApiGet } from "@/lib/public-api";
import type { PublicCategoryDetail } from "@/lib/types";

interface Params {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  return publicApiGet<PublicCategoryDetail>(`/public/categories/${slug}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.label} Suppliers | OilfieldHub`,
    description: `${category.publishedSupplierCount} verified ${category.label} suppliers on OilfieldHub.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryDetailPage({ params }: Params) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/categories" className="mb-4 inline-block text-[12px] font-semibold text-muted hover:text-brand-dark">
        ← All categories
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold text-ink">{category.label}</h1>
      <p className="mb-6 text-[13.5px] text-muted">{category.publishedSupplierCount} verified suppliers</p>

      <div className="space-y-3">
        {category.suppliers.map((s) => (
          <Link
            key={s.slug}
            href={`/suppliers/${s.slug}`}
            className="flex items-center justify-between rounded-2xl border border-hairline bg-panel p-4 shadow-[0_1px_2px_rgba(13,43,30,0.04)] transition hover:border-brand/40"
          >
            <span className="font-semibold text-ink">{s.displayName}</span>
            <ScoreBadge score={s.score} size="sm" />
          </Link>
        ))}
        {category.suppliers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-hairline p-8 text-center text-[13px] text-muted">
            No verified suppliers in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
