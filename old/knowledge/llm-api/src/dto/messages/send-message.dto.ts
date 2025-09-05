import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageInputDto } from './message-input.dto';

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'Context ID for the conversation',
    example: 'chat',
    default: 'chat',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || 'chat')
  contextId?: string = 'chat';

  @ApiProperty({
    description: 'Message content to send to the agent',
    example: 'Hello, how can you help me?',
    minLength: 1,
    maxLength: 10000,
  })
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @IsString()
  @MinLength(1, { message: 'Message must be at least 1 character long' })
  @MaxLength(10000, { message: 'Message cannot exceed 10000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;

  @ApiPropertyOptional({
    description:
      'Alternative property for message content (deprecated - use content)',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => {
    // If content is not provided, use message as fallback
    if (!obj.content && value) {
      obj.content = value.trim();
    }
    return value;
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Session ID for conversation tracking',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Session ID must be a valid UUID v4' })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'User ID for the message sender',
    example: 'user123',
    default: 'user',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => value || 'user')
  userId?: string = 'user';

  @ApiPropertyOptional({
    description: 'Additional input data for the context',
    type: MessageInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageInputDto)
  input?: MessageInputDto;
}
