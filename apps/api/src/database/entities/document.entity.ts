import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { DocumentType } from './enums';
import { User } from './user.entity';
import { enumColumnType, timestampType } from '../column-types';

/**
 * Polymorphic attachment (MTC/cert/photo/KYB doc) linked to any entity by
 * type + id. `code` is the filing-system reference (e.g. "MTC-PO-0001", see
 * common/reference-codes.ts) — globally unique across the whole platform
 * (this is the internal filing system's identifier for the document, not a
 * per-tenant label), assigned once at creation. `archivedAt` is a soft
 * archive flag: archived documents stay in the filing system (audit trail,
 * matches the append-only Event log ethos) but drop out of the default
 * active-documents view.
 */
@Entity({ name: 'documents' })
@Index(['entityType', 'entityId'])
export class Document extends TenantEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: enumColumnType, enum: DocumentType })
  documentType!: DocumentType;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'uuid' })
  uploadedById!: string;

  @Column({ type: timestampType, nullable: true })
  archivedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;
}
