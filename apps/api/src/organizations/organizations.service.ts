import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';
import { KybStatus, OrganizationType } from '../database/entities/enums';
import { EventsService } from '../events/events.service';

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  country?: string | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  country?: string | null;
  approvalThreshold?: number;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    private readonly eventsService: EventsService,
  ) {}

  create(input: CreateOrganizationInput, manager?: EntityManager): Promise<Organization> {
    const repo = manager ? manager.getRepository(Organization) : this.organizationsRepository;
    const organization = repo.create({
      name: input.name,
      type: input.type,
      country: input.country ?? null,
    });
    return repo.save(organization);
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({ where: { id } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const organization = await this.findById(id);
    Object.assign(organization, input);
    return this.organizationsRepository.save(organization);
  }

  /**
   * The admin verification queue the design spec always called for
   * ("Verification queue: pending orgs with docs meta, Verify/Reject
   * actions") but Phase 2 never actually built — `kybStatus` sat on the
   * schema unused since Phase 1. Platform-wide (not org-scoped): ADMIN
   * needs to see every organization's pending verification, not just
   * their own.
   */
  findPending(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { kybStatus: KybStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async verify(id: string, actorUserId: string): Promise<Organization> {
    const organization = await this.findById(id);
    if (organization.kybStatus !== KybStatus.PENDING) {
      throw new BadRequestException('Organization is not pending verification');
    }
    organization.kybStatus = KybStatus.VERIFIED;
    await this.organizationsRepository.save(organization);

    await this.eventsService.record('supplier.verified', {
      organizationId: organization.id,
      entityType: 'Organization',
      entityId: organization.id,
      actorId: actorUserId,
      note: `${organization.name} KYB verified`,
    });

    return organization;
  }

  async reject(id: string, actorUserId: string): Promise<Organization> {
    const organization = await this.findById(id);
    if (organization.kybStatus !== KybStatus.PENDING) {
      throw new BadRequestException('Organization is not pending verification');
    }
    organization.kybStatus = KybStatus.REJECTED;
    await this.organizationsRepository.save(organization);

    await this.eventsService.record('supplier.rejected', {
      organizationId: organization.id,
      entityType: 'Organization',
      entityId: organization.id,
      actorId: actorUserId,
      note: `${organization.name} KYB rejected`,
    });

    return organization;
  }
}
