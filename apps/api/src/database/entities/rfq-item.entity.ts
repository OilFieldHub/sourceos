import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { Rfq } from './rfq.entity';

@Entity({ name: 'rfq_items' })
export class RfqItem extends TenantEntity {
  @Index()
  @Column({ type: 'uuid' })
  rfqId!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity!: string;

  @Column({ type: 'varchar', length: 40 })
  unit!: string;

  @ManyToOne(() => Rfq, (rfq) => rfq.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq!: Rfq;
}
