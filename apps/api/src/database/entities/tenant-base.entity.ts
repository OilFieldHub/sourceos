import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { timestampType } from '../column-types';

/**
 * Shared shape for every multi-tenant table: id (UUID), organizationId,
 * createdAt, updatedAt — per Phase 1 spec. Organization itself is the tenant
 * root and does not extend this (it has no organizationId of its own).
 */
export abstract class TenantEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn({ type: timestampType })
  createdAt!: Date;

  @UpdateDateColumn({ type: timestampType })
  updatedAt!: Date;
}
