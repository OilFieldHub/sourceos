import { UserRole } from '../database/entities/enums';

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
}
