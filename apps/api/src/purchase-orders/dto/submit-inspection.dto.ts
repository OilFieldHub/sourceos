import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SubmitInspectionDto {
  @IsOptional()
  @IsString()
  reportId?: string;

  @IsBoolean()
  conditionCheck!: boolean;

  @IsBoolean()
  certsCheck!: boolean;

  @IsBoolean()
  quantityCheck!: boolean;
}
