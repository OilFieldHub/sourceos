import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types';
import { RfqCategoryPreset, RfqStatus } from '../database/entities/enums';
import { Evaluation } from '../database/entities/evaluation.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { RfqItem } from '../database/entities/rfq-item.entity';
import { EventsService } from '../events/events.service';
import {
  ANOMALY_THRESHOLD,
  MIN_QUOTES_FOR_ANOMALY_CHECK,
  LineAnomaly,
  computePriceScore,
  computeReliabilityScore,
  computeRiskScore,
  detectLineAnomalies,
  round2,
} from './evaluation-scoring';
import { CommodityContextService } from './commodity-context.service';
import { PriceIndexService } from './price-index.service';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Rfq)
    private readonly rfqsRepository: Repository<Rfq>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(Evaluation)
    private readonly evaluationsRepository: Repository<Evaluation>,
    private readonly eventsService: EventsService,
    private readonly priceIndexService: PriceIndexService,
    private readonly commodityContextService: CommodityContextService,
  ) {}

  async evaluate(user: AuthenticatedUser, rfqId: string): Promise<Evaluation[]> {
    const rfq = await this.rfqsRepository.findOne({ where: { id: rfqId }, relations: ['items'] });
    if (!rfq || rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ must be OPEN to run evaluation');
    }
    if (!rfq.weightsLocked) {
      throw new BadRequestException('RFQ has no locked weights — publish it first');
    }

    const quotations = await this.quotationsRepository.find({
      where: { rfqId },
      relations: ['items', 'supplier'],
    });
    if (quotations.length === 0) {
      throw new BadRequestException('No quotes have been submitted for this RFQ');
    }

    const weights = rfq.weightsLocked;
    const allLines = quotations.flatMap((q) =>
      q.items.map((item) => ({
        quotationId: q.id,
        rfqItemId: item.rfqItemId,
        unitPrice: parseFloat(item.unitPrice),
      })),
    );
    const anomaliesByQuotation = detectLineAnomalies(allLines);
    await this.applyPriceIndexFallback(rfq.items, allLines, anomaliesByQuotation);
    const bestTotal = Math.min(...quotations.map((q) => parseFloat(q.totalAmount)));

    // Informational-only context, RIG_CHARTER only (see CommodityContextService) — not folded into any score.
    const commodityNote =
      rfq.categoryPreset === RfqCategoryPreset.RIG_CHARTER ? await this.commodityContextService.getWtiTrendNote() : null;

    const scored = quotations.map((q) => {
      const totalAmount = parseFloat(q.totalAmount);
      const anomalies = anomaliesByQuotation.get(q.id) ?? [];

      const priceScore = computePriceScore(totalAmount, bestTotal);
      const reliabilityScore = computeReliabilityScore(q.supplier.onTimeRate);
      const riskScore = computeRiskScore(q.supplier.riskLevel, anomalies.length);
      const compositeScore = round2(
        (weights.price * priceScore + weights.reliability * reliabilityScore + weights.risk * riskScore) / 100,
      );

      const reasons: string[] = [
        totalAmount === bestTotal
          ? `Lowest-priced bid among ${quotations.length} quotes ($${totalAmount.toLocaleString()})`
          : `Priced $${totalAmount.toLocaleString()}, ${round2(((totalAmount - bestTotal) / bestTotal) * 100)}% above the lowest bid`,
        q.supplier.onTimeRate === null
          ? 'Cold-start supplier — no completed-contract history yet, reliability scored neutral'
          : `On-time delivery rate: ${q.supplier.onTimeRate}%`,
        q.supplier.riskLevel === null
          ? 'Cold-start supplier — no risk rating yet, risk scored neutral'
          : `${q.supplier.riskLevel} platform risk rating`,
      ];

      let anomalyDetail: string | null = null;
      if (anomalies.length > 0) {
        anomalyDetail = anomalies
          .map((a) => {
            const direction = a.deviationPct < 0 ? 'below' : 'above';
            const magnitude = Math.abs(round2(a.deviationPct * 100));
            const basis =
              a.source === 'platform-index'
                ? `the platform-wide price index ($${a.medianUnitPrice.toLocaleString()} median across ${a.quoteCount} historical quotes for this line item — too few quotes on this RFQ alone to compare)`
                : `the $${a.medianUnitPrice.toLocaleString()} median across ${a.quoteCount} quotes for this RFQ line`;
            return `line priced ${magnitude}% ${direction} ${basis}`;
          })
          .join('; ');
        reasons.push(`⚠ Anomalous pricing detected — risk score reduced (${anomalyDetail})`);
      }

      if (commodityNote) {
        reasons.push(commodityNote);
      }

      return {
        quotation: q,
        priceScore,
        reliabilityScore,
        riskScore,
        compositeScore,
        reasons,
        anomalyFlag: anomalies.length > 0,
        anomalyDetail,
      };
    });

    scored.sort(
      (a, b) =>
        b.compositeScore - a.compositeScore || parseFloat(a.quotation.totalAmount) - parseFloat(b.quotation.totalAmount),
    );

    await this.evaluationsRepository.save(
      scored.map((s, index) =>
        this.evaluationsRepository.create({
          organizationId: rfq.organizationId,
          rfqId: rfq.id,
          quotationId: s.quotation.id,
          supplierId: s.quotation.supplierId,
          priceScore: s.priceScore.toFixed(2),
          reliabilityScore: s.reliabilityScore.toFixed(2),
          riskScore: s.riskScore.toFixed(2),
          compositeScore: s.compositeScore.toFixed(2),
          rank: index + 1,
          weightsUsed: weights,
          reasons: s.reasons,
          anomalyFlag: s.anomalyFlag,
          anomalyDetail: s.anomalyDetail,
        }),
      ),
    );

    rfq.status = RfqStatus.EVALUATION;
    await this.rfqsRepository.save(rfq);

    await this.eventsService.record('rfq.evaluated', {
      organizationId: rfq.organizationId,
      entityType: 'Rfq',
      entityId: rfq.id,
      actorId: user.userId,
      note: `${quotations.length} quote(s) scored and ranked`,
    });

    return this.evaluationsRepository.find({ where: { rfqId }, order: { rank: 'ASC' } });
  }

  /**
   * README's "category price index when n<5" fallback: for any RFQ line
   * with too few same-RFQ quotes for `detectLineAnomalies` to have checked
   * it, look up the platform-wide price index instead (PriceIndexService)
   * and flag against that. Mutates `anomaliesByQuotation` in place.
   */
  private async applyPriceIndexFallback(
    rfqItems: RfqItem[],
    allLines: Array<{ quotationId: string; rfqItemId: string; unitPrice: number }>,
    anomaliesByQuotation: Map<string, LineAnomaly[]>,
  ): Promise<void> {
    const lineCounts = new Map<string, number>();
    for (const line of allLines) {
      lineCounts.set(line.rfqItemId, (lineCounts.get(line.rfqItemId) ?? 0) + 1);
    }
    const itemsById = new Map(rfqItems.map((i) => [i.id, i]));

    for (const [rfqItemId, count] of lineCounts) {
      if (count >= MIN_QUOTES_FOR_ANOMALY_CHECK) {
        continue;
      }
      const item = itemsById.get(rfqItemId);
      if (!item) {
        continue;
      }
      const benchmark = await this.priceIndexService.getBenchmark(item.description);
      if (!benchmark) {
        continue;
      }
      for (const line of allLines.filter((l) => l.rfqItemId === rfqItemId)) {
        const deviationPct = (line.unitPrice - benchmark.medianUnitPrice) / benchmark.medianUnitPrice;
        if (Math.abs(deviationPct) < ANOMALY_THRESHOLD) {
          continue;
        }
        const list = anomaliesByQuotation.get(line.quotationId) ?? [];
        list.push({
          rfqItemId,
          unitPrice: line.unitPrice,
          medianUnitPrice: benchmark.medianUnitPrice,
          deviationPct,
          quoteCount: benchmark.sampleSize,
          source: 'platform-index',
        });
        anomaliesByQuotation.set(line.quotationId, list);
      }
    }
  }

  async listForRfq(user: AuthenticatedUser, rfqId: string): Promise<Evaluation[]> {
    const rfq = await this.rfqsRepository.findOne({ where: { id: rfqId } });
    if (!rfq || rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }

    return this.evaluationsRepository.find({
      where: { rfqId },
      relations: ['supplier'],
      order: { rank: 'ASC' },
    });
  }
}
