import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/entities/enums';
import { isUniqueViolation } from '../common/db-errors';

const PASSWORD_SALT_ROUNDS = 10;

export interface CreateUserInput {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * `email` is only unique per-organization (see users' `(organizationId, email)`
   * index), so the same address can exist under more than one organization.
   * Login has to resolve across all of them.
   */
  findByEmailAcrossOrgs(email: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getMany();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(input: CreateUserInput, manager?: EntityManager): Promise<User> {
    const repo = manager ? manager.getRepository(User) : this.usersRepository;
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = repo.create({
      organizationId: input.organizationId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isActive: true,
    });

    try {
      return await repo.save(user);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A user with this email already exists in this organization');
      }
      throw err;
    }
  }
}
