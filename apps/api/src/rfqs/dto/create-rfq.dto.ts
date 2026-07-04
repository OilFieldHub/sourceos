import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RfqCategoryPreset } from '../../database/entities/enums';

export class CreateRfqItemDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  @MinLength(1)
  unit!: string;
}

export class CreateRfqDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsEnum(RfqCategoryPreset)
  categoryPreset!: RfqCategoryPreset;

  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRfqItemDto)
  items!: CreateRfqItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  invitedSupplierIds!: string[];
}
