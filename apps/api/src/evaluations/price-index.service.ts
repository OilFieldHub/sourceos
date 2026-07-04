import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotationItem } from '../database/entities/quotation-item.entity';
import { median } from './evaluation-scoring';

export const MIN_SAMPLE_SIZE_FOR_INDEX = 5;

export interface PriceBenchmark {
  medianUnitPrice: number;
  sampleSize: number;
}

/**
 * The README-specified "category price index" fallback (amendment #2:
 * "fall back to category price index when n<5") — never built until now
 * because no such index existed anywhere in the schema. Rather than a real
 * product/SKU taxonomy (which the schema has no room for — RFQ line items
 * are free text), this benchmarks by exact normalized line-item
 * *description* match across every quotation ever submitted, any RFQ, any
 * organization. That's honest about its own limits: it catches recurring
 * exact-text items ("FR coveralls") but won't fuzzy-match close variants
 * ("FR coverall, size L") — a real product taxonomy is future work, not
 * something to fake here.
 *
 * This is also the platform's clearest network effect: every additional
 * buyer/supplier transaction on the platform makes this benchmark more
 * accurate for everyone, with zero new external dependencies — the data
 * already existed in QuotationItem, it just wasn't being aggregated.
 */
@Injectable()
export class PriceIndexService {
  constructor(
    @InjectRepository(QuotationItem)
    private readonly quotationItemsRepository: Repository<QuotationItem>,
  ) {}

  async getBenchmark(description: string): Promise<PriceBenchmark | null> {
    const normalized = description.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const rows = await this.quotationItemsRepository
      .createQueryBuilder('qi')
      .innerJoin('qi.rfqItem', 'item')
      .where('LOWER(TRIM(item.description)) = :normalized', { normalized })
      .select('qi.unitPrice', 'unitPrice')
      .getRawMany<{ unitPrice: string }>();

    const prices = rows.map((r) => parseFloat(r.unitPrice)).filter((p) => !Number.isNaN(p) && p > 0);
    if (prices.length < MIN_SAMPLE_SIZE_FOR_INDEX) {
      return null;
    }

    return { medianUnitPrice: median(prices), sampleSize: prices.length };
  }
}
