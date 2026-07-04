import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { RequirementStatus } from './enums';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { enumColumnType } from '../column-types';

/** Internal buyer requisition, upstream of an RFQ. */
@Entity({ name: 'requirements' })
export class Requirement extends TenantEntity {
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  category!: string | null;

  @Index()
  @Column({ type: enumColumnType, enum: RequirementStatus, default: RequirementStatus.DRAFT })
  status!: RequirementStatus;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;
}
