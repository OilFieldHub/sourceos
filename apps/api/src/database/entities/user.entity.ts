import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from './tenant-base.entity';
import { UserRole } from './enums';
import { Organization } from './organization.entity';
import { enumColumnType } from '../column-types';

@Entity({ name: 'users' })
@Index(['organizationId', 'email'], { unique: true })
export class User extends TenantEntity {
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120 })
  firstName!: string;

  @Column({ type: 'varchar', length: 120 })
  lastName!: string;

  @Column({ type: enumColumnType, enum: UserRole })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => Organization, (org) => org.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;
}
