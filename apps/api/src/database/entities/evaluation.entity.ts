import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { Rfq, EvaluationWeights } from './rfq.entity';
import { Quotation } from './quotation.entity';
import { Supplier } from './supplier.entity';
import { jsonColumnType } from '../column-types';

/**
 * One row per supplier per RFQ evaluation run. `weightsUsed` is a snapshot
 * of `rfq.weightsLocked` at scoring time so historical evaluations stay
 * correct even if presets change later. `reasons` backs the explainable
 * "why this score" bullets (Phase 8 requirement).
 */
@Entity({ name: 'evaluations' })
@Index(['rfqId', 'supplierId'], { unique: true })
export class Evaluation extends TenantEntity {
  @Column({ type: 'uuid' })
  rfqId!: string;

  @Column({ type: 'uuid' })
  quotationId!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  priceScore!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  reliabilityScore!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  riskScore!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  compositeScore!: string;

  @Column({ type: 'int' })
  rank!: number;

  @Column({ type: jsonColumnType })
  weightsUsed!: EvaluationWeights;

  @Column({ type: jsonColumnType, default: () => "'[]'" })
  reasons!: string[];

  @Column({ type: 'boolean', default: false })
  anomalyFlag!: boolean;

  @Column({ type: 'text', nullable: true })
  anomalyDetail!: string | null;

  @ManyToOne(() => Rfq, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq!: Rfq;

  @ManyToOne(() => Quotation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotationId' })
  quotation!: Quotation;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;
}
