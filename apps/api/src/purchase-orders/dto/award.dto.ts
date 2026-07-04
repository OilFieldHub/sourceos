import { IsUUID } from 'class-validator';

export class AwardDto {
  @IsUUID()
  supplierId!: string;
}
