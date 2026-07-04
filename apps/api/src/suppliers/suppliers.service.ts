import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { DisputeStatus, GrnStatus, InspectionResult, PoStage, RiskLevel } from '../database/entities/enums';
import { Grn } from '../database/entities/grn.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { Invoice } from '../database/entities/invoice.entity';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Supplier } from '../database/entities/supplier.entity';

export interface CreateSupplierInput {
  organizationId: string;
  displayName: string;
}

export interface SupplierHistory {
  score: number | null;
  riskLevel: RiskLevel | null;
  onTimeRate: string | null;
  completedContracts: number;
  disputesCount: number;
  scoreDrivers: string[] | null;
  quotesSubmitted: number;
  rfqsWon: number;
  winRate: number;
  totalRevenuePaid: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * SourceOS scoring (Phase 8) — judgment calls, not spec-mandated formulas
 * (same disclaimer as `evaluations/evaluation-scoring.ts`). The schema has
 * no "promised delivery date" anywhere, so a literal calendar on-time rate
 * isn't computable; `onTimeRate` is instead a **clean-completion rate**:
 * the share of this supplier's PAID POs that reached PAID with no partial
 * GRN, no failed inspection, no invoice 3-way-match override, and no
 * dispute along the way. Revisit if a due-date field ever gets added.
 */
const DISPUTE_PENALTY_PER_DISPUTE = 15;
const DISPUTE_PENALTY_CAP = 45;
const VOLUME_BONUS_PER_CONTRACT = 2;
const VOLUME_BONUS_CAP = 10;
const NEUTRAL_RATE_NO_COMPLETIONS = 70;

function computeRiskLevel(onTimeRate: number | null, disputesCount: number): RiskLevel {
  if (disputesCount >= 2) return RiskLevel.HIGH;
  if (onTimeRate !== null && onTimeRate < 60) return RiskLevel.HIGH;
  if (disputesCount >= 1) return RiskLevel.MEDIUM;
  if (onTimeRate !== null && onTimeRate < 90) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

function computeSourceOsScore(onTimeRate: number | null, disputesCount: number, completedContracts: number): number {
  const base = onTimeRate ?? NEUTRAL_RATE_NO_COMPLETIONS;
  const disputePenalty = Math.min(disputesCount * DISPUTE_PENALTY_PER_DISPUTE, DISPUTE_PENALTY_CAP);
  const volumeBonus = Math.min(completedContracts * VOLUME_BONUS_PER_CONTRACT, VOLUME_BONUS_CAP);
  return Math.max(0, Math.min(100, Math.round(base - disputePenalty + volumeBonus)));
}

function buildScoreDrivers(
  completedContracts: number,
  disputesCount: number,
  onTimeRate: number | null,
  riskLevel: RiskLevel,
): string[] {
  const drivers = [`${completedContracts} completed contract${completedContracts === 1 ? '' : 's'}`];
  if (onTimeRate !== null) {
    drivers.push(`${onTimeRate}% clean completion rate (no exceptions or disputes)`);
  }
  drivers.push(disputesCount === 0 ? 'No disputes on record' : `${disputesCount} dispute${disputesCount === 1 ? '' : 's'} on record`);
  drivers.push(`${riskLevel} risk rating`);
  return drivers;
}

/**
 * Content-completeness gate for SEO pages (amendment #10: "publish only
 * above a content-completeness threshold — score + history + certs
 * present"). Three named signals, each worth a third: SourceOS score
 * present, >=1 completed contract, >=1 certification on file. There's no
 * self-serve way for a supplier to add certifications yet (a related,
 * separate gap — not built here), so that signal will read false for
 * every supplier today; the other two are still enough to clear the
 * threshold, which is set at 2-of-3 rather than 3-of-3 for exactly that
 * reason.
 */
const COMPLETENESS_SIGNAL_WEIGHT = 100 / 3;
const COMPLETENESS_PUBLISH_THRESHOLD = 60; // ~2 of 3 signals

function computeContentCompleteness(
  score: number | null,
  completedContracts: number,
  certifications: string[],
): { contentCompletenessScore: number; seoPublished: boolean } {
  let signals = 0;
  if (score !== null) signals++;
  if (completedContracts >= 1) signals++;
  if (certifications.length >= 1) signals++;

  const contentCompletenessScore = Math.round(signals * COMPLETENESS_SIGNAL_WEIGHT);
  return { contentCompletenessScore, seoPublished: contentCompletenessScore >= COMPLETENESS_PUBLISH_THRESHOLD };
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrder>,
    @InjectRepository(Grn)
    private readonly grnsRepository: Repository<Grn>,
    @InjectRepository(Inspection)
    private readonly inspectionsRepository: Repository<Inspection>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  create(input: CreateSupplierInput, manager?: EntityManager): Promise<Supplier> {
    const repo = manager ? manager.getRepository(Supplier) : this.suppliersRepository;
    // score/riskLevel/onTimeRate stay null (cold-start — amendment #3, never 0).
    const supplier = repo.create({
      organizationId: input.organizationId,
      displayName: input.displayName,
      score: null,
      riskLevel: null,
      onTimeRate: null,
      completedContracts: 0,
      disputesCount: 0,
      certifications: [],
      scoreDrivers: null,
      contentCompletenessScore: 0,
      seoPublished: false,
    });
    return repo.save(supplier);
  }

  findByOrganizationId(organizationId: string): Promise<Supplier | null> {
    return this.suppliersRepository.findOne({ where: { organizationId } });
  }

  /** Platform-wide directory — suppliers aren't scoped to a buyer org. */
  findAll(): Promise<Supplier[]> {
    return this.suppliersRepository.find({ order: { displayName: 'ASC' } });
  }

  findByIds(ids: string[]): Promise<Supplier[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.suppliersRepository.find({ where: { id: In(ids) } });
  }

  /**
   * quotesSubmitted/rfqsWon/winRate/totalRevenuePaid are computed from actual
   * quote/PO history — everything else here (score, riskLevel, onTimeRate,
   * scoreDrivers) is surfaced as-is from the profile and stays null/UNRATED
   * until Phase 8 (SourceOS intelligence) actually populates it.
   */
  async getHistory(organizationId: string): Promise<SupplierHistory> {
    const supplier = await this.findByOrganizationId(organizationId);
    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    const quotesSubmitted = await this.quotationsRepository.count({ where: { supplierId: supplier.id } });
    const purchaseOrders = await this.purchaseOrdersRepository.find({ where: { supplierId: supplier.id } });
    const rfqsWon = purchaseOrders.length;
    const winRate = quotesSubmitted > 0 ? round2((rfqsWon / quotesSubmitted) * 100) : 0;
    const totalRevenuePaid = purchaseOrders
      .filter((po) => po.stage === PoStage.PAID)
      .reduce((sum, po) => sum + parseFloat(po.totalValue), 0);

    return {
      score: supplier.score,
      riskLevel: supplier.riskLevel,
      onTimeRate: supplier.onTimeRate,
      completedContracts: supplier.completedContracts,
      disputesCount: supplier.disputesCount,
      scoreDrivers: supplier.scoreDrivers,
      quotesSubmitted,
      rfqsWon,
      winRate,
      totalRevenuePaid: round2(totalRevenuePaid).toFixed(2),
    };
  }

  /**
   * Refreshes the platform-wide SourceOS profile (score/riskLevel/onTimeRate/
   * completedContracts/disputesCount/scoreDrivers) from this supplier's full
   * PO history. Called after a payment releases (a contract completes) and
   * after a dispute opens (an immediate risk signal) — see
   * PurchaseOrderLifecycleService.
   */
  async recomputeScore(supplierId: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const purchaseOrders = await this.purchaseOrdersRepository.find({ where: { supplierId } });
    const completedPos = purchaseOrders.filter((po) => po.stage === PoStage.PAID);
    const completedContracts = completedPos.length;
    const disputesCount = purchaseOrders.filter((po) => po.disputeStatus !== DisputeStatus.NONE).length;

    let onTimeRate: number | null = null;
    if (completedContracts > 0) {
      const poIds = completedPos.map((po) => po.id);
      const [grns, inspections, invoices] = await Promise.all([
        this.grnsRepository.find({ where: { purchaseOrderId: In(poIds) } }),
        this.inspectionsRepository.find({ where: { purchaseOrderId: In(poIds) } }),
        this.invoicesRepository.find({ where: { purchaseOrderId: In(poIds) } }),
      ]);
      const partialGrnPoIds = new Set(
        grns.filter((g) => g.status === GrnStatus.PARTIAL).map((g) => g.purchaseOrderId),
      );
      const failedInspectionPoIds = new Set(
        inspections.filter((i) => i.result === InspectionResult.FAILED).map((i) => i.purchaseOrderId),
      );
      const mismatchedInvoicePoIds = new Set(
        invoices.filter((inv) => inv.threeWayMatch.some((line) => !line.matched)).map((inv) => inv.purchaseOrderId),
      );

      const cleanCount = completedPos.filter(
        (po) =>
          !partialGrnPoIds.has(po.id) &&
          !failedInspectionPoIds.has(po.id) &&
          !mismatchedInvoicePoIds.has(po.id) &&
          po.disputeStatus === DisputeStatus.NONE,
      ).length;
      onTimeRate = round2((cleanCount / completedContracts) * 100);
    }

    const riskLevel = computeRiskLevel(onTimeRate, disputesCount);
    const score = computeSourceOsScore(onTimeRate, disputesCount, completedContracts);

    const { contentCompletenessScore, seoPublished } = computeContentCompleteness(
      score,
      completedContracts,
      supplier.certifications,
    );

    supplier.completedContracts = completedContracts;
    supplier.disputesCount = disputesCount;
    supplier.onTimeRate = onTimeRate !== null ? onTimeRate.toFixed(2) : null;
    supplier.riskLevel = riskLevel;
    supplier.score = score;
    supplier.scoreDrivers = buildScoreDrivers(completedContracts, disputesCount, onTimeRate, riskLevel);
    supplier.contentCompletenessScore = contentCompletenessScore;
    supplier.seoPublished = seoPublished;

    return this.suppliersRepository.save(supplier);
  }
}
