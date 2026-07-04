import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';
import { OrganizationType } from '../database/entities/enums';

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  country?: string | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  country?: string | null;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
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
}
