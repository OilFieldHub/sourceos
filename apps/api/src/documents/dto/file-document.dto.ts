import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { DocumentType } from '../../database/entities/enums';

export class FileDocumentDto {
  @IsString()
  @MinLength(1)
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsString()
  @MinLength(1)
  url!: string;
}
