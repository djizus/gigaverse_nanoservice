import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AgentCapabilitiesDto {
  @ApiPropertyOptional({
    description: 'Can the agent browse the web',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canBrowseWeb?: boolean;

  @ApiPropertyOptional({
    description: 'Can the agent access files',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canAccessFiles?: boolean;

  @ApiPropertyOptional({
    description: 'Can the agent execute code',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canExecuteCode?: boolean;

  @ApiPropertyOptional({
    description: 'Can the agent use MCP servers',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canUseMcp?: boolean;

  @ApiPropertyOptional({
    description: 'List of allowed MCP server IDs',
    example: ['notion', 'linear'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMcpServers?: string[];

  @ApiPropertyOptional({
    description: 'Additional custom capabilities',
    example: { customFeature: true },
  })
  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}
