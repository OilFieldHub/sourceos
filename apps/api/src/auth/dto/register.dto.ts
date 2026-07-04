import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { OrganizationType } from '../../database/entities/enums';

const SELF_SERVE_ORGANIZATION_TYPES = [OrganizationType.BUYER, OrganizationType.SUPPLIER] as const;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  organizationName!: string;

  @IsIn(SELF_SERVE_ORGANIZATION_TYPES)
  organizationType!: OrganizationType;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
