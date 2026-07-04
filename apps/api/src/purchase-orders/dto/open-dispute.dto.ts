import { IsOptional, IsString } from 'class-validator';

export class OpenDisputeDto {
  @IsOptional()
  @IsString()
  note?: string;
}
