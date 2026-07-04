import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { InspectionResult } from './enums';
import { PurchaseOrder } from './purchase-order.entity';
import { Grn } from './grn.entity';
import { enumColumnType, timestampType } from '../column-types';

/** `inspection.failed` holds the lifecycle (advance blocked, escrow untouched) until exception.resolved — amendment #4. */
@Entity({ name: 'inspections' })
export class Inspection extends TenantEntity {
  @Index()
  @Column({ type: 'uuid' })
  purchaseOrderId!: string;

  @Column({ type: 'uuid' })
  grnId!: string;

  @Column({ type: 'varchar', length: 60 })
  reportId!: string;

  @Column({ type: 'boolean', default: false })
  conditionCheck!: boolean;

  @Column({ type: 'boolean', default: false })
  certsCheck!: boolean;

  @Column({ type: 'boolean', default: false })
  quantityCheck!: boolean;

  @Column({ type: enumColumnType, enum: InspectionResult })
  result!: InspectionResult;

  @Column({ type: timestampType })
  inspectedAt!: Date;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder;

  @ManyToOne(() => Grn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grnId' })
  grn!: Grn;
}
