import { Injectable } from '@nestjs/common';

const CACHE_MS = 5 * 60 * 1000;

interface TwelveDataQuote {
  percent_change?: string;
  code?: number;
}

/**
 * Informational-only commodity context for RIG_CHARTER evaluations —
 * deliberately NOT a scoring input. Asserting a precise correlation
 * coefficient between oil-price movement and rig day-rates would be a
 * fabricated number (the real relationship is real but not something this
 * codebase has data to quantify) — so this surfaces the raw WTI trend as
 * context for the human reviewer to weigh themselves, exactly the same ETF
 * proxy (`USO`) already used by the dashboard's Market Pulse widget.
 */
@Injectable()
export class CommodityContextService {
  private cached: { percentChange: number; asOf: number } | null = null;

  async getWtiTrendNote(): Promise<string | null> {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      return null;
    }

    if (this.cached && Date.now() - this.cached.asOf < CACHE_MS) {
      return this.formatNote(this.cached.percentChange);
    }

    try {
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=USO&apikey=${apiKey}`);
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as TwelveDataQuote;
      if (data.code || !data.percent_change) {
        return null;
      }
      const percentChange = Number(data.percent_change);
      this.cached = { percentChange, asOf: Date.now() };
      return this.formatNote(percentChange);
    } catch {
      return null;
    }
  }

  private formatNote(percentChange: number): string {
    const direction = percentChange >= 0 ? 'up' : 'down';
    return `Context: WTI crude (ETF proxy) is ${direction} ${Math.abs(percentChange).toFixed(1)}% recently — informational only, not a scoring input.`;
  }
}
