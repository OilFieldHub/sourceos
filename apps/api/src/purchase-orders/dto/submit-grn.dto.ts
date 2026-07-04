import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class GrnLineDto {
  @IsUUID()
  rfqItemId!: string;

  @IsNumber()
  @Min(0)
  receivedQty!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class SubmitGrnDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lines!: GrnLineDto[];
}
