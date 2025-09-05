import {
  IsOptional,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageInputDto {
  @ApiPropertyOptional({
    description: 'Type of input data',
    example: 'text',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Additional data for the input',
    example: { key: 'value' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
