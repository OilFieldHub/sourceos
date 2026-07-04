import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RFQ_TEMPLATES } from "@/lib/static-content";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const template = RFQ_TEMPLATES.find((t) => t.slug === slug);
  if (!template) return {};
  return {
    title: `${template.title} | OilfieldHub`,
    description: template.summary,
    alternates: { canonical: `/rfq-template/${template.slug}` },
  };
}

export default async function RfqTemplateDetailPage({ params }: Params) {
  const { slug } = await params;
  const template = RFQ_TEMPLATES.find((t) => t.slug === slug);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/rfq-template" className="mb-4 inline-block text-[12px] font-semibold text-muted hover:text-brand-dark">
        ← All templates
      </Link>
      <h1 className="mb-4 text-2xl font-extrabold text-ink">{template.title}</h1>
      <div className="rounded-2xl border border-hairline bg-panel p-6 shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
        <div className="space-y-3 text-[14px] leading-relaxed text-ink/80">
          {template.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
