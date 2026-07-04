"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { formatRelative } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { Supplier } from "@/lib/types";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

/**
 * Cross-references fetched headlines against known supplier names (every
 * supplier in the platform directory for a buyer, or just their own org
 * name for a supplier) so a mention turns from decorative news into an
 * actual early-warning signal on that supplier's risk profile — not just
 * a homepage widget. Simple case-insensitive substring match; a real NER
 * pipeline would be more precise but this needs no new external
 * dependency and catches the common case (a supplier's distinctive name
 * showing up verbatim in a headline).
 */
function findMentionedSupplier(title: string, supplierNames: string[]): string | null {
  const lowerTitle = title.toLowerCase();
  return supplierNames.find((name) => name.length > 3 && lowerTitle.includes(name.toLowerCase())) ?? null;
}

export function IndustryNews() {
  const { session } = useAuth();
  const api = useAuthedApi();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [configured, setConfigured] = useState(true);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: { configured: boolean; articles: NewsArticle[] }) => {
        setConfigured(data.configured);
        setArticles(data.articles ?? []);
      })
      .catch(() => {});

    if (session?.user.role === "SUPPLIER_USER") {
      setSupplierNames(session.organization.name ? [session.organization.name] : []);
    } else {
      api
        .get<Supplier[]>("/suppliers")
        .then((suppliers) => setSupplierNames(suppliers.map((s) => s.displayName)))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.role]);

  const withMentions = articles
    .slice(0, 12)
    .map((a) => ({ ...a, mentionedSupplier: findMentionedSupplier(a.title, supplierNames) }))
    .sort((a, b) => Number(!!b.mentionedSupplier) - Number(!!a.mentionedSupplier))
    .slice(0, 6);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-ink">Industry news</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
          Nigeria · Africa · Global oil &amp; gas
        </span>
      </div>
      {!configured ? (
        <p className="rounded-xl bg-sand px-3.5 py-2.5 text-[12.5px] text-muted">
          Add a <code className="font-mono">NEWSAPI_API_KEY</code> to <code className="font-mono">.env.local</code> to
          show live headlines here.
        </p>
      ) : (
        <div className="space-y-1">
          {withMentions.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start justify-between gap-3 rounded-lg px-2 py-2 text-[12.5px] hover:bg-row ${
                a.mentionedSupplier ? "bg-gold-bg" : ""
              }`}
            >
              <span className="text-ink">
                {a.mentionedSupplier && (
                  <span className="mr-1.5 rounded-full bg-gold px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-gold-ink">
                    Mentions {a.mentionedSupplier}
                  </span>
                )}
                {a.title} <span className="font-mono text-[10.5px] text-muted">— {a.source}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-muted">
                {formatRelative(a.publishedAt)}
              </span>
            </a>
          ))}
          {withMentions.length === 0 && <p className="px-2 py-3 text-[13px] text-muted">No recent headlines found.</p>}
        </div>
      )}
    </Card>
  );
}
