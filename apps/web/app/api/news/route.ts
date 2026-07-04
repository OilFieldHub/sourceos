import { clientIp, isRateLimited } from "@/lib/rate-limit";

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsApiArticle {
  title: string;
  url: string;
  publishedAt: string;
  source?: { name?: string };
}

const QUERY = "(oil OR gas OR petroleum) AND (Nigeria OR Africa OR OPEC OR Seplat OR NNPC)";

export async function GET(request: Request) {
  if (isRateLimited(clientIp(request))) {
    return Response.json({ configured: true, error: true, articles: [] }, { status: 429 });
  }

  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) {
    return Response.json({ configured: false, articles: [] });
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(QUERY)}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${apiKey}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) {
      return Response.json({ configured: true, error: true, articles: [] }, { status: 502 });
    }
    const data = (await res.json()) as { articles?: NewsApiArticle[] };
    const articles: NewsArticle[] = (data.articles ?? []).map((a) => ({
      title: a.title,
      source: a.source?.name ?? "Unknown",
      url: a.url,
      publishedAt: a.publishedAt,
    }));
    return Response.json({ configured: true, articles });
  } catch {
    return Response.json({ configured: true, error: true, articles: [] }, { status: 502 });
  }
}
