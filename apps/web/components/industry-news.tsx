"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { formatRelative } from "@/lib/format";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export function IndustryNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: { configured: boolean; articles: NewsArticle[] }) => {
        setConfigured(data.configured);
        setArticles(data.articles ?? []);
      })
      .catch(() => {});
  }, []);

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
          {articles.slice(0, 6).map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 text-[12.5px] hover:bg-row"
            >
              <span className="text-ink">
                {a.title} <span className="font-mono text-[10.5px] text-muted">— {a.source}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-muted">
                {formatRelative(a.publishedAt)}
              </span>
            </a>
          ))}
          {articles.length === 0 && <p className="px-2 py-3 text-[13px] text-muted">No recent headlines found.</p>}
        </div>
      )}
    </Card>
  );
}
