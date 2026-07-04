import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsPositive, IsUUID, ValidateNested } from 'class-validator';

export class SubmitQuoteItemDto {
  @IsUUID()
  rfqItemId!: string;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}

export class SubmitQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuoteItemDto)
  items!: SubmitQuoteItemDto[];
}
