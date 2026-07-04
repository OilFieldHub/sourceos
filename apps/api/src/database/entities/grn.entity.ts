import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { GrnStatus } from './enums';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
import { enumColumnType, jsonColumnType, timestampType } from '../column-types';

export interface GrnLine {
  rfqItemId: string;
  qtyOk: boolean;
  receivedQty: number;
  photoUrls: string[];
}

/**
 * `grn.partial` holds the PO lifecycle (advance blocked) until
 * exception.resolved — amendment #4. `grnNumber` is globally unique
 * (platform-wide filing/reference code, not a per-tenant sequence) — see
 * common/reference-codes.ts.
 */
@Entity({ name: 'grns' })
export class Grn extends TenantEntity {
  @Column({ type: 'varchar', length: 40, unique: true })
  grnNumber!: string;

  @Index()
  @Column({ type: 'uuid' })
  purchaseOrderId!: string;

  @Column({ type: 'uuid' })
  receivedById!: string;

  @Column({ type: timestampType })
  receivedAt!: Date;

  @Column({ type: enumColumnType, enum: GrnStatus })
  status!: GrnStatus;

  @Column({ type: jsonColumnType, default: () => "'[]'" })
  lines!: GrnLine[];

  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receivedById' })
  receivedBy!: User;
}
