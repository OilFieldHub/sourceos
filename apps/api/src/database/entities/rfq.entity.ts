import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { RfqCategoryPreset, RfqStatus } from './enums';
import { Organization } from './organization.entity';
import { Requirement } from './requirement.entity';
import { Supplier } from './supplier.entity';
import { RfqItem } from './rfq-item.entity';
import { enumColumnType, jsonColumnType, timestampType } from '../column-types';

export interface EvaluationWeights {
  price: number;
  reliability: number;
  risk: number;
}

/**
 * Weights are frozen onto the row at `rfq.published` (Red-Team amendment
 * #1) and must never be mutated after quotes start arriving — enforce in
 * the service layer (Phase 3/5), not just here.
 */
@Entity({ name: 'rfqs' })
export class Rfq extends TenantEntity {
  /**
   * Reference code, e.g. "RFQ-0001" — globally unique (platform-wide filing
   * code, not a per-tenant sequence — see common/reference-codes.ts).
   * `nullable: true` at the DB level only so this column can be added to a
   * table that may already have rows (a zero-downtime add-nullable-then-
   * backfill migration, not a design gap) — every RFQ created going forward
   * always gets one from `RfqsService.create`.
   */
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  rfqNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'uuid', nullable: true })
  requirementId!: string | null;

  @Column({ type: enumColumnType, enum: RfqCategoryPreset })
  categoryPreset!: RfqCategoryPreset;

  @Index()
  @Column({ type: enumColumnType, enum: RfqStatus, default: RfqStatus.DRAFT })
  status!: RfqStatus;

  @Column({ type: jsonColumnType, nullable: true })
  weightsLocked!: EvaluationWeights | null;

  @Column({ type: timestampType, nullable: true })
  publishedAt!: Date | null;

  @Column({ type: timestampType, nullable: true })
  closeDate!: Date | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @ManyToOne(() => Requirement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requirementId' })
  requirement!: Requirement | null;

  @OneToMany(() => RfqItem, (item) => item.rfq)
  items!: RfqItem[];

  @ManyToMany(() => Supplier)
  @JoinTable({
    name: 'rfq_invited_suppliers',
    joinColumn: { name: 'rfqId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'supplierId', referencedColumnName: 'id' },
  })
  invitedSuppliers!: Supplier[];
}
