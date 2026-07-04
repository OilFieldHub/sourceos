import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { QuotationStatus } from './enums';
import { Rfq } from './rfq.entity';
import { Supplier } from './supplier.entity';
import { QuotationItem } from './quotation-item.entity';
import { enumColumnType, timestampType } from '../column-types';

/** One quote per supplier per RFQ in v1 — enforced via unique index. */
@Entity({ name: 'quotations' })
@Index(['rfqId', 'supplierId'], { unique: true })
export class Quotation extends TenantEntity {
  @Column({ type: 'uuid' })
  rfqId!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  totalAmount!: string;

  @Column({ type: enumColumnType, enum: QuotationStatus, default: QuotationStatus.SUBMITTED })
  status!: QuotationStatus;

  @Column({ type: timestampType, nullable: true })
  submittedAt!: Date | null;

  @ManyToOne(() => Rfq, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq!: Rfq;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @OneToMany(() => QuotationItem, (item) => item.quotation)
  items!: QuotationItem[];
}
