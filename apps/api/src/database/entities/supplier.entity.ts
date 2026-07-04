import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { RiskLevel } from './enums';
import { Organization } from './organization.entity';
import { enumColumnType, jsonColumnType } from '../column-types';

/**
 * SourceOS profile for a SUPPLIER-type Organization. `organizationId` is the
 * supplier's own org id (unique — 1:1). `score` is nullable so cold-start
 * suppliers with zero completed contracts render as UNRATED, never 0
 * (Red-Team amendment #3).
 */
@Entity({ name: 'suppliers' })
@Unique(['organizationId'])
export class Supplier extends TenantEntity {
  @Column({ type: 'varchar', length: 255 })
  displayName!: string;

  @Column({ type: 'smallint', nullable: true })
  score!: number | null;

  @Column({ type: enumColumnType, enum: RiskLevel, nullable: true })
  riskLevel!: RiskLevel | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  onTimeRate!: string | null;

  @Column({ type: 'int', default: 0 })
  completedContracts!: number;

  @Column({ type: 'int', default: 0 })
  disputesCount!: number;

  @Column({ type: jsonColumnType, default: () => "'[]'" })
  certifications!: string[];

  @Column({ type: jsonColumnType, nullable: true })
  scoreDrivers!: string[] | null;

  /** Content-completeness gate for programmatic SEO pages (amendment #10). */
  @Column({ type: 'smallint', default: 0 })
  contentCompletenessScore!: number;

  @Column({ type: 'boolean', default: false })
  seoPublished!: boolean;

  @OneToOne(() => Organization, (org) => org.supplierProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;
}
