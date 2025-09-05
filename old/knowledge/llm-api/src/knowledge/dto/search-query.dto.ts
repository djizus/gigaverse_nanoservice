import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query text' })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by document type',
    enum: ['markdown', 'json', 'text', 'yaml'],
  })
  @IsOptional()
  @IsEnum(['markdown', 'json', 'text', 'yaml'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by collection',
    type: String,
  })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Search mode',
    enum: ['semantic', 'keyword', 'hybrid'],
    default: 'hybrid',
  })
  @IsOptional()
  @IsEnum(['semantic', 'keyword', 'hybrid'])
  mode?: 'semantic' | 'keyword' | 'hybrid' = 'hybrid';
}
