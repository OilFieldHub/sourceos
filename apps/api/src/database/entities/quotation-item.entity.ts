import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { Quotation } from './quotation.entity';
import { RfqItem } from './rfq-item.entity';

@Entity({ name: 'quotation_items' })
@Index(['quotationId', 'rfqItemId'], { unique: true })
export class QuotationItem extends TenantEntity {
  @Column({ type: 'uuid' })
  quotationId!: string;

  @Column({ type: 'uuid' })
  rfqItemId!: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  unitPrice!: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  lineTotal!: string;

  @ManyToOne(() => Quotation, (quotation) => quotation.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotationId' })
  quotation!: Quotation;

  @ManyToOne(() => RfqItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqItemId' })
  rfqItem!: RfqItem;
}
