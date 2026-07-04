import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GUIDES } from "@/lib/static-content";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | OilfieldHub`,
    description: guide.summary,
    alternates: { canonical: `/guide/${guide.slug}` },
  };
}

export default async function GuideDetailPage({ params }: Params) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/guide" className="mb-4 inline-block text-[12px] font-semibold text-muted hover:text-brand-dark">
        ← All guides
      </Link>
      <h1 className="mb-4 text-2xl font-extrabold text-ink">{guide.title}</h1>
      <div className="rounded-2xl border border-hairline bg-panel p-6 shadow-[0_1px_2px_rgba(13,43,30,0.04)]">
        <div className="space-y-3 text-[14px] leading-relaxed text-ink/80">
          {guide.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
