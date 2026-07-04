import type { MetadataRoute } from "next";
import { publicApiGet } from "@/lib/public-api";
import { SITE_URL } from "@/lib/site";
import { GUIDES, RFQ_TEMPLATES } from "@/lib/static-content";
import type { PublicCategorySummary, PublicSupplierSummary } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [suppliers, categories] = await Promise.all([
    publicApiGet<PublicSupplierSummary[]>("/public/suppliers").catch(() => []),
    publicApiGet<PublicCategorySummary[]>("/public/categories").catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/suppliers`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/rfq-template`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/guide`, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const s of suppliers ?? []) {
    entries.push({ url: `${SITE_URL}/suppliers/${s.slug}`, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const c of categories ?? []) {
    entries.push({ url: `${SITE_URL}/categories/${c.slug}`, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const t of RFQ_TEMPLATES) {
    entries.push({ url: `${SITE_URL}/rfq-template/${t.slug}`, changeFrequency: "monthly", priority: 0.4 });
  }
  for (const g of GUIDES) {
    entries.push({ url: `${SITE_URL}/guide/${g.slug}`, changeFrequency: "monthly", priority: 0.4 });
  }

  return entries;
}
