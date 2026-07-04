import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { User } from './user.entity';
import { charColumnType, jsonColumnType } from '../column-types';

/**
 * Append-only source of truth (amendment #8). Never UPDATE or DELETE a row
 * here — enforce with a DB-level rule/trigger in the initial migration and
 * again at the service layer in Phase 2. `sequence` is a per-organization
 * monotonic counter assigned by the event-bus service so the hash chain has
 * a deterministic order independent of clock resolution; `hash` =
 * sha256(prevHash + createdAt + type + entityType + entityId + note),
 * `prevHash` is null only for the first event in an organization's chain.
 * Chain integrity is re-verified server-side on every read (amendment #8).
 */
@Entity({ name: 'events' })
@Index(['organizationId', 'sequence'], { unique: true })
export class Event extends TenantEntity {
  @Column({ type: 'bigint' })
  sequence!: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  type!: string;

  @Column({ type: 'varchar', length: 60 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: jsonColumnType, nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: charColumnType, length: 64, nullable: true })
  prevHash!: string | null;

  @Column({ type: charColumnType, length: 64 })
  hash!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor!: User | null;
}
