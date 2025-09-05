import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAgentDto } from './create-agent.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  DELETED = 'deleted',
}

export class UpdateAgentDto extends PartialType(
  OmitType(CreateAgentDto, ['id'] as const),
) {
  @ApiPropertyOptional({
    description: 'Agent status',
    enum: AgentStatus,
    example: AgentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;
}
