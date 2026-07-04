import { MARKET_SYMBOLS, type MarketQuote } from "@/lib/market-config";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

interface TwelveDataQuote {
  symbol?: string;
  close?: string;
  percent_change?: string;
  code?: number;
}

export async function GET(request: Request) {
  if (isRateLimited(clientIp(request))) {
    return Response.json({ configured: true, error: true, quotes: [] }, { status: 429 });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return Response.json({ configured: false, quotes: [] });
  }

  const symbols = MARKET_SYMBOLS.map((s) => s.symbol).join(",");

  try {
    const res = await fetch(`https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${apiKey}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return Response.json({ configured: true, error: true, quotes: [] }, { status: 502 });
    }
    const data = (await res.json()) as Record<string, TwelveDataQuote> | TwelveDataQuote;

    // Twelve Data returns a symbol-keyed object for batched requests, or a
    // single flat quote object when only one symbol was requested.
    const bySymbol: Record<string, TwelveDataQuote> =
      "symbol" in data && MARKET_SYMBOLS.length === 1
        ? { [MARKET_SYMBOLS[0].symbol]: data as TwelveDataQuote }
        : (data as Record<string, TwelveDataQuote>);

    const quotes: MarketQuote[] = MARKET_SYMBOLS.map((s) => {
      const q = bySymbol[s.symbol];
      if (!q || q.code) {
        return { ...s, price: null, percentChange: null };
      }
      return {
        ...s,
        price: q.close ? Number(q.close) : null,
        percentChange: q.percent_change ? Number(q.percent_change) : null,
      };
    });

    return Response.json({ configured: true, quotes });
  } catch {
    return Response.json({ configured: true, error: true, quotes: [] }, { status: 502 });
  }
}
