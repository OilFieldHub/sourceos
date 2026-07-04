import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { slugify } from '../common/slug';
import { PoStage, RfqCategoryPreset } from '../database/entities/enums';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { Supplier } from '../database/entities/supplier.entity';

const CATEGORY_LABELS: Record<RfqCategoryPreset, string> = {
  [RfqCategoryPreset.RIG_CHARTER]: 'Rig Charter',
  [RfqCategoryPreset.GENERAL_SUPPLY]: 'General Supply',
};

export interface PublicSupplierSummary {
  slug: string;
  displayName: string;
  score: number | null;
  riskLevel: string | null;
  onTimeRate: string | null;
  completedContracts: number;
  certifications: string[];
}

export interface PublicCategorySummary {
  slug: string;
  preset: RfqCategoryPreset;
  label: string;
  publishedSupplierCount: number;
}

/**
 * Backs the unauthenticated SEO pages (Phase 9). Only ever reads
 * `seoPublished=true` suppliers (amendment #10's thin-content gate) — a
 * held (unpublished) supplier is invisible here even if you know its slug.
 */
@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrder>,
    @InjectRepository(Rfq)
    private readonly rfqsRepository: Repository<Rfq>,
  ) {}

  async listSuppliers(): Promise<PublicSupplierSummary[]> {
    const suppliers = await this.publishedSuppliers();
    return suppliers.map((s) => this.toSummary(s));
  }

  async findSupplierBySlug(slug: string): Promise<PublicSupplierSummary> {
    const suppliers = await this.publishedSuppliers();
    const match = suppliers.find((s) => slugify(s.displayName) === slug);
    if (!match) {
      throw new NotFoundException('Supplier page not found');
    }
    return this.toSummary(match);
  }

  async listCategories(): Promise<PublicCategorySummary[]> {
    return Promise.all(Object.values(RfqCategoryPreset).map((preset) => this.categorySummary(preset)));
  }

  async findCategoryBySlug(
    slug: string,
  ): Promise<PublicCategorySummary & { suppliers: PublicSupplierSummary[] }> {
    const preset = Object.values(RfqCategoryPreset).find((p) => slugify(CATEGORY_LABELS[p]) === slug);
    if (!preset) {
      throw new NotFoundException('Category page not found');
    }
    const [summary, suppliers] = await Promise.all([
      this.categorySummary(preset),
      this.suppliersForCategory(preset),
    ]);
    return { ...summary, suppliers: suppliers.map((s) => this.toSummary(s)) };
  }

  async compareSuppliers(
    slugA: string,
    slugB: string,
  ): Promise<{ a: PublicSupplierSummary; b: PublicSupplierSummary }> {
    const [a, b] = await Promise.all([this.findSupplierBySlug(slugA), this.findSupplierBySlug(slugB)]);
    return { a, b };
  }

  private publishedSuppliers(): Promise<Supplier[]> {
    return this.suppliersRepository.find({ where: { seoPublished: true }, order: { displayName: 'ASC' } });
  }

  private async suppliersForCategory(preset: RfqCategoryPreset): Promise<Supplier[]> {
    const rfqs = await this.rfqsRepository.find({ where: { categoryPreset: preset } });
    if (rfqs.length === 0) {
      return [];
    }
    const pos = await this.purchaseOrdersRepository.find({
      where: { rfqId: In(rfqs.map((r) => r.id)), stage: PoStage.PAID },
    });
    const supplierIds = new Set(pos.map((po) => po.supplierId));
    if (supplierIds.size === 0) {
      return [];
    }
    const published = await this.publishedSuppliers();
    return published.filter((s) => supplierIds.has(s.id));
  }

  private async categorySummary(preset: RfqCategoryPreset): Promise<PublicCategorySummary> {
    const suppliers = await this.suppliersForCategory(preset);
    return {
      slug: slugify(CATEGORY_LABELS[preset]),
      preset,
      label: CATEGORY_LABELS[preset],
      publishedSupplierCount: suppliers.length,
    };
  }

  private toSummary(s: Supplier): PublicSupplierSummary {
    return {
      slug: slugify(s.displayName),
      displayName: s.displayName,
      score: s.score,
      riskLevel: s.riskLevel,
      onTimeRate: s.onTimeRate,
      completedContracts: s.completedContracts,
      certifications: s.certifications,
    };
  }
}
