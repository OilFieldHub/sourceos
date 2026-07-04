import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';
import { OrganizationType, UserRole } from '../database/entities/enums';
import { Supplier } from '../database/entities/supplier.entity';
import { User } from '../database/entities/user.entity';
import { EventsService } from '../events/events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: UserRole };
  organization: { id: string; name: string; type: OrganizationType };
  supplier?: { id: string; displayName: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly suppliersService: SuppliersService,
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const role = dto.organizationType === OrganizationType.BUYER ? UserRole.BUYER_ADMIN : UserRole.SUPPLIER_USER;

    const { organization, user, supplier } = await this.dataSource.transaction(async (manager) => {
      const organization = await this.organizationsService.create(
        { name: dto.organizationName, type: dto.organizationType },
        manager,
      );
      const user = await this.usersService.create(
        {
          organizationId: organization.id,
          email: dto.email,
          password: dto.password,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role,
        },
        manager,
      );

      // Every SUPPLIER-type org needs its 1:1 SourceOS profile row up front —
      // RFQ invites and quote submission key off Supplier.id, not the org id.
      const supplier =
        dto.organizationType === OrganizationType.SUPPLIER
          ? await this.suppliersService.create(
              { organizationId: organization.id, displayName: dto.organizationName },
              manager,
            )
          : null;

      return { organization, user, supplier };
    });

    await this.eventsService.record('organization.registered', {
      organizationId: organization.id,
      entityType: 'Organization',
      entityId: organization.id,
      actorId: user.id,
      note: `${organization.name} registered`,
    });

    await this.eventsService.record('user.registered', {
      organizationId: organization.id,
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      note: `${user.email} joined as ${role}`,
    });

    if (supplier) {
      await this.eventsService.record('supplier.registered', {
        organizationId: organization.id,
        entityType: 'Supplier',
        entityId: supplier.id,
        actorId: user.id,
        note: `${supplier.displayName} supplier profile created`,
      });
    }

    return this.buildAuthResult(user, organization, supplier ?? undefined);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const candidates = await this.usersService.findByEmailAcrossOrgs(dto.email);

    const matches: User[] = [];
    for (const candidate of candidates) {
      if (candidate.isActive && (await bcrypt.compare(dto.password, candidate.passwordHash))) {
        matches.push(candidate);
      }
    }

    if (matches.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (matches.length > 1) {
      // `email` is only unique per-organization; the same address exists as
      // a valid login under more than one org here, which login alone can't
      // disambiguate.
      throw new ConflictException(
        'This email is registered under multiple organizations; contact support to resolve',
      );
    }

    const user = matches[0];
    const organization = await this.organizationsService.findById(user.organizationId);
    const supplier =
      user.role === UserRole.SUPPLIER_USER
        ? await this.suppliersService.findByOrganizationId(user.organizationId)
        : null;
    return this.buildAuthResult(user, organization, supplier ?? undefined);
  }

  private buildAuthResult(user: User, organization: Organization, supplier?: Supplier): AuthResult {
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: organization.id,
      role: user.role,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: { id: organization.id, name: organization.name, type: organization.type },
      ...(supplier ? { supplier: { id: supplier.id, displayName: supplier.displayName } } : {}),
    };
  }
}
