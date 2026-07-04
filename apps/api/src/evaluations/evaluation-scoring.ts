import { RiskLevel } from '../database/entities/enums';

/**
 * Scoring constants below are this implementation's judgment calls, not
 * spec-mandated numbers — the phase spec/README describe the *shape*
 * (price/reliability/risk composite, two-sided anomaly detection, cold-start
 * neutrality) but not an exact formula. Revisit here if Phase 8 (SourceOS
 * intelligence) formalizes real ones.
 */
export const NEUTRAL_SCORE = 70; // cold-start supplier, amendment #3 — never 0
export const ANOMALY_THRESHOLD = 0.3; // ±30% vs line-item median, README default
export const ANOMALY_RISK_PENALTY = 30;
export const MIN_QUOTES_FOR_ANOMALY_CHECK = 3; // below this, "median" is degenerate

const RISK_LEVEL_SCORE: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 90,
  [RiskLevel.MEDIUM]: 65,
  [RiskLevel.HIGH]: 35,
};

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface LineAnomaly {
  rfqItemId: string;
  unitPrice: number;
  medianUnitPrice: number;
  deviationPct: number; // signed — e.g. -0.47 = 47% below median
  quoteCount: number;
  /** 'rfq' = compared against this RFQ's own quotes; 'platform-index' = the cross-RFQ price-index fallback (see PriceIndexService). */
  source: 'rfq' | 'platform-index';
}

/**
 * Per-line anomaly detection (amendment #2): flags both LOW and HIGH
 * outliers against the line-item median across all quotes submitted for
 * this RFQ. Requires >=3 quotes for a given line before flagging — with 1-2
 * data points "median" is degenerate and any difference looks like an
 * outlier. Lines below that threshold are picked up by
 * `PriceIndexService`'s platform-wide fallback instead (see
 * EvaluationsService.evaluate) — the README's "category price index when
 * n<5" fallback.
 */
export function detectLineAnomalies(
  quotationLines: Array<{ quotationId: string; rfqItemId: string; unitPrice: number }>,
): Map<string, LineAnomaly[]> {
  const byRfqItem = new Map<string, Array<{ quotationId: string; unitPrice: number }>>();
  for (const line of quotationLines) {
    const list = byRfqItem.get(line.rfqItemId) ?? [];
    list.push({ quotationId: line.quotationId, unitPrice: line.unitPrice });
    byRfqItem.set(line.rfqItemId, list);
  }

  const anomaliesByQuotation = new Map<string, LineAnomaly[]>();
  for (const [rfqItemId, lines] of byRfqItem) {
    if (lines.length < MIN_QUOTES_FOR_ANOMALY_CHECK) {
      continue;
    }
    const med = median(lines.map((l) => l.unitPrice));
    if (med === 0) {
      continue;
    }
    for (const line of lines) {
      const deviationPct = (line.unitPrice - med) / med;
      if (Math.abs(deviationPct) >= ANOMALY_THRESHOLD) {
        const list = anomaliesByQuotation.get(line.quotationId) ?? [];
        list.push({
          rfqItemId,
          unitPrice: line.unitPrice,
          medianUnitPrice: med,
          deviationPct,
          quoteCount: lines.length,
          source: 'rfq',
        });
        anomaliesByQuotation.set(line.quotationId, list);
      }
    }
  }
  return anomaliesByQuotation;
}

/** Cheapest quote among peers scores 100; others scale down proportionally. */
export function computePriceScore(totalAmount: number, bestTotal: number): number {
  if (bestTotal <= 0 || totalAmount <= 0) {
    return NEUTRAL_SCORE;
  }
  return round2(Math.min(100, (bestTotal / totalAmount) * 100));
}

export function computeReliabilityScore(onTimeRate: string | null): number {
  if (onTimeRate === null) {
    return NEUTRAL_SCORE;
  }
  return round2(parseFloat(onTimeRate));
}

/**
 * Anomalous pricing is treated as a risk signal (execution/trust concern),
 * not a price-quality one — it penalizes riskScore, leaving priceScore a
 * clean measure of price competitiveness on its own.
 */
export function computeRiskScore(riskLevel: RiskLevel | null, anomalyCount: number): number {
  const base = riskLevel === null ? NEUTRAL_SCORE : RISK_LEVEL_SCORE[riskLevel];
  const penalty = anomalyCount > 0 ? ANOMALY_RISK_PENALTY : 0;
  return round2(Math.max(0, base - penalty));
}
