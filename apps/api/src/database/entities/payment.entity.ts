import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { PaymentStatus } from './enums';
import { Invoice } from './invoice.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { enumColumnType, timestampType } from '../column-types';

@Entity({ name: 'payments' })
export class Payment extends TenantEntity {
  /**
   * Reference code, e.g. "PAY-0001" — globally unique (platform-wide filing
   * code, not a per-tenant sequence — see common/reference-codes.ts).
   * `nullable: true` at the DB level only for the same zero-downtime
   * add-then-backfill reason as `Rfq.rfqNumber` — every payment released
   * going forward always gets one.
   */
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  paymentNumber!: string;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Index()
  @Column({ type: 'uuid' })
  purchaseOrderId!: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount!: string;

  @Column({ type: enumColumnType, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: timestampType, nullable: true })
  releasedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  escrowReleaseNote!: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder;
}
