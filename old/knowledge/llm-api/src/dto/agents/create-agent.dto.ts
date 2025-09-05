import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsObject,
  ValidateNested,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModelType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GROQ = 'groq',
}

export enum ModelId {
  // Anthropic models
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-latest',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-latest',
  CLAUDE_3_OPUS = 'claude-3-opus-latest',
  // OpenAI models
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  // Groq models
  LLAMA_3_1_405B = 'llama-3.1-405b-reasoning',
  LLAMA_3_1_70B = 'llama-3.1-70b-versatile',
  LLAMA_3_1_8B = 'llama-3.1-8b-instant',
}

export class CreateAgentDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the agent (will be generated if not provided)',
    example: 'my-custom-agent-id',
    pattern: '^[a-zA-Z0-9-_]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message:
      'ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  @MinLength(3)
  @MaxLength(100)
  id?: string;

  @ApiProperty({
    description: 'Model provider type',
    enum: ModelType,
    example: ModelType.ANTHROPIC,
  })
  @IsNotEmpty()
  @IsEnum(ModelType, {
    message: 'Model type must be one of: anthropic, openai, groq',
  })
  modelType: ModelType;

  @ApiProperty({
    description: 'Specific model ID',
    example: ModelId.CLAUDE_3_5_SONNET,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  modelId: string;

  @ApiProperty({
    description: 'Agent name',
    example: 'Customer Support Agent',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Agent description',
    example: 'An AI agent specialized in customer support and assistance',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'System instructions for the agent',
    example:
      'You are a helpful customer support agent. Always be polite and professional.',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Available contexts for the agent',
    example: ['chat', 'notion'],
    default: ['chat'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value || ['chat'])
  contexts?: string[] = ['chat'];

  @ApiPropertyOptional({
    description: 'Configuration for each context',
    example: { chat: { sessionDuration: 3600 } },
  })
  @IsOptional()
  @IsObject()
  contextArgs?: Record<string, any>;

  // @ApiPropertyOptional({
  //   description: 'Agent capabilities configuration',
  //   example: ['chat', 'memory', 'linear'],
  // })
  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // capabilities?: string[];

  @ApiPropertyOptional({
    description: 'Initial agent statistics',
    example: { totalMessages: 0, totalSessions: 0 },
  })
  @IsOptional()
  @IsObject()
  stats?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the agent',
    example: { version: '1.0.0', environment: 'production' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Template ID to create agent from',
    example: 'customer-support-template',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Custom arguments for the agent',
    example: { apiKey: 'sk-...', endpoint: 'https://api.example.com' },
  })
  @IsOptional()
  @IsObject()
  customArgs?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'MCP (Model Context Protocol) configuration',
    example: { servers: [] },
  })
  @IsOptional()
  @IsObject()
  mcpConfig?: any;

  @ApiPropertyOptional({
    description: 'Maximum number of steps the agent can perform',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  maxSteps?: number;
}
