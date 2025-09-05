import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateVariableDto {
  @IsString()
  name: string;

  @IsEnum(['text', 'number', 'boolean', 'select'])
  type: 'text' | 'number' | 'boolean' | 'select';

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  options?: string[]; // For select type

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateEnhancedTemplateDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  // Model configuration
  @IsOptional()
  @IsEnum(['anthropic', 'openai'])
  modelType?: 'anthropic' | 'openai';

  @IsOptional()
  @IsString()
  modelId?: string;

  // Context configuration
  @IsArray()
  @IsString({ each: true })
  contexts: string[];

  @IsOptional()
  @IsObject()
  contextArgs?: Record<string, any>;

  // Capabilities
  @IsArray()
  @IsString({ each: true })
  capabilities: string[];

  // Instructions with variables
  @IsString()
  instructions: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  // MCP configuration
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mcpServers?: string[];

  // Metadata
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examplePrompts?: string[];
}

export class UpdateEnhancedTemplateDto extends CreateEnhancedTemplateDto {
  @IsOptional()
  @IsString()
  id?: string;
}
