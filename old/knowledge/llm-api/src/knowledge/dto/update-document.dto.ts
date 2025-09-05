import {
  IsOptional,
  IsBoolean,
  IsString,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentMetadataDto } from './create-document.dto';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Document type',
    enum: ['markdown', 'json', 'text', 'yaml'],
  })
  @IsOptional()
  @IsEnum(['markdown', 'json', 'text', 'yaml'])
  type?: 'markdown' | 'json' | 'text' | 'yaml';

  @ApiPropertyOptional({
    description: 'Document metadata',
    type: DocumentMetadataDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DocumentMetadataDto)
  metadata?: DocumentMetadataDto;

  @ApiPropertyOptional({
    description: 'Whether to re-index the document after update',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  reindex?: boolean = true;
}
