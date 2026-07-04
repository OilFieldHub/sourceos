import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KybStatus, OrganizationType } from './enums';
import { User } from './user.entity';
import { Supplier } from './supplier.entity';
import { enumColumnType, timestampType } from '../column-types';

/**
 * Tenant root. Every other table's `organizationId` points here.
 * A SUPPLIER-type organization gets a 1:1 Supplier profile carrying
 * SourceOS scoring / KYB / SEO fields.
 */
@Entity({ name: 'organizations' })
export class Organization extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index()
  @Column({ type: enumColumnType, enum: OrganizationType })
  type!: OrganizationType;

  @Column({ type: enumColumnType, enum: KybStatus, default: KybStatus.PENDING })
  kybStatus!: KybStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  country!: string | null;

  /**
   * Per-organization override for the segregation-of-duties PO approval
   * gate (amendment #6) — null means "use the platform default ($250k, see
   * purchase-orders.service.ts's DEFAULT_APPROVAL_THRESHOLD)". Some buyers
   * need approval at $50k, others never need it at all; hardcoding one
   * number for every organization was never realistic.
   */
  @Column({ type: 'integer', nullable: true })
  approvalThreshold!: number | null;

  @CreateDateColumn({ type: timestampType })
  createdAt!: Date;

  @UpdateDateColumn({ type: timestampType })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToOne(() => Supplier, (supplier) => supplier.organization)
  supplierProfile!: Supplier | null;
}
