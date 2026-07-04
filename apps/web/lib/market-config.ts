export interface MarketSymbolConfig {
  symbol: string;
  label: string;
  unit: string;
}

/**
 * Twelve Data's free plan returns 403 for raw commodity/index codes
 * (BRENT/WTI/SPX/UKX all rejected — "not available with your plan"), and
 * "WTI" as a bare symbol actually resolves to an unrelated NYSE stock
 * ticker (W&T Offshore Inc.), not the commodity. Using ETF trackers
 * instead — all confirmed working on the free plan — and labeling them
 * honestly as ETFs rather than claiming to show the literal benchmark
 * (an ETF share price is not the same number as the index/commodity it
 * tracks).
 */
export const MARKET_SYMBOLS: MarketSymbolConfig[] = [
  { symbol: "BNO", label: "Brent Crude (ETF)", unit: "$" },
  { symbol: "USO", label: "WTI Crude (ETF)", unit: "$" },
  { symbol: "SPY", label: "S&P 500 (ETF)", unit: "$" },
  { symbol: "FLGB", label: "FTSE 100 (ETF)", unit: "$" },
];

export interface MarketQuote extends MarketSymbolConfig {
  price: number | null;
  percentChange: number | null;
}
