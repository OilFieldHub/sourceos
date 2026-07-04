import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  /** Segregation-of-duties approval threshold (amendment #6) — null/omitted means "use the platform default ($250k)". */
  @IsOptional()
  @IsInt()
  @Min(0)
  approvalThreshold?: number;
}
