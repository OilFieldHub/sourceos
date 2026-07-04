import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { InvoiceStatus } from './enums';
import { PurchaseOrder } from './purchase-order.entity';
import { enumColumnType, jsonColumnType, timestampType } from '../column-types';

export interface ThreeWayMatchLine {
  rfqItemId: string;
  poQty: string;
  grnQty: string;
  invoiceQty: string;
  matched: boolean;
}

@Entity({ name: 'invoices' })
export class Invoice extends TenantEntity {
  @Column({ type: 'varchar', length: 40, unique: true })
  invoiceNumber!: string;

  @Index()
  @Column({ type: 'uuid' })
  purchaseOrderId!: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount!: string;

  @Column({ type: jsonColumnType, default: () => "'[]'" })
  threeWayMatch!: ThreeWayMatchLine[];

  @Column({ type: enumColumnType, enum: InvoiceStatus, default: InvoiceStatus.SUBMITTED })
  status!: InvoiceStatus;

  @Column({ type: timestampType, nullable: true })
  submittedAt!: Date | null;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder;
}
