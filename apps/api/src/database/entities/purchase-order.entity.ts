import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { DisputeStatus, PoStage } from './enums';
import { Rfq } from './rfq.entity';
import { Quotation } from './quotation.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { enumColumnType, timestampType } from '../column-types';

/**
 * Lifecycle stage is strictly sequential (ISSUED → ACKNOWLEDGED →
 * GRN_RECEIVED → INSPECTED → INVOICED → PAID); enforce ordering server-side
 * in Phase 5. `escrowFunded` gates the Acknowledged stage (amendment #5).
 * `requiresApproval` marks awards/releases above $250k that must route
 * through the Approvals queue with approver != requester (amendment #6).
 * `disputeStatus` freezes escrow only for the disputed line — the frozen
 * line itself is tracked on the Invoice's three-way-match payload.
 */
@Entity({ name: 'purchase_orders' })
export class PurchaseOrder extends TenantEntity {
  @Column({ type: 'varchar', length: 40, unique: true })
  poNumber!: string;

  @Column({ type: 'uuid' })
  rfqId!: string;

  @Column({ type: 'uuid' })
  quotationId!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Index()
  @Column({ type: enumColumnType, enum: PoStage, default: PoStage.ISSUED })
  stage!: PoStage;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  totalValue!: string;

  @Column({ type: 'boolean', default: false })
  escrowFunded!: boolean;

  @Column({ type: timestampType, nullable: true })
  escrowFundedAt!: Date | null;

  @Column({ type: enumColumnType, enum: DisputeStatus, default: DisputeStatus.NONE })
  disputeStatus!: DisputeStatus;

  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null;

  @Column({ type: timestampType, nullable: true })
  approvedAt!: Date | null;

  @ManyToOne(() => Rfq, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rfqId' })
  rfq!: Rfq;

  @ManyToOne(() => Quotation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quotationId' })
  quotation!: Quotation;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy!: User | null;
}
