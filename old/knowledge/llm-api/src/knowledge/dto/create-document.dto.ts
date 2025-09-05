import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentMetadataDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Source of the document' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Author of the document' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Collection name' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ description: 'Document language', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string = 'en';
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document file path' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Document type',
    enum: ['markdown', 'json', 'text', 'yaml'],
    default: 'text',
  })
  @IsOptional()
  @IsEnum(['markdown', 'json', 'text', 'yaml'])
  type?: 'markdown' | 'json' | 'text' | 'yaml' = 'text';

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
    description: 'Whether to index the document immediately',
    default: true,
  })
  @IsOptional()
  index?: boolean = true;
}
