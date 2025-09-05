import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Delete,
  Put,
} from '@nestjs/common';
import { DaydreamsService } from '../daydreams.service';
import {
  CreateAgentDto,
  CreateAgentFromTemplateDto,
  CreateAgentWithTemplateDto,
} from '../dto/agent.dto';
import { ResponseWrapper } from '../utils/response-wrapper';
import { ModelId, ModelType, OpenAIModelId } from '../types/models';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';

@Controller('daydreams/agents')
@UseGuards(SupabaseAuthGuard)
export class AgentsController {
  constructor(private readonly daydreamsService: DaydreamsService) {}

  @Get()
  async getAgents(@CurrentUserId() userId: string) {
    // Get only agents belonging to the current user
    const agents = await this.daydreamsService.getAgentsByUserId(userId);
    return { agents };
  }

  @Get(':id')
  async getAgent(
    @Param('id') agentId: string,
    @CurrentUserId() userId: string,
  ) {
    const config = await this.daydreamsService.getAgentConfig(agentId);
    if (!config) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
      };
    }

    // Verify the agent belongs to the current user
    const isOwner = await this.daydreamsService.verifyAgentOwnership(
      agentId,
      userId,
    );
    if (!isOwner) {
      return {
        success: false,
        error: `Access denied`,
      };
    }

    return {
      success: true,
      agent: {
        id: agentId,
        config,
      },
    };
  }

  @Post()
  async createAgent(
    @Body() dto: CreateAgentDto,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      console.log('\x1b[36m%s\x1b[0m', '[INFO] Creating agent with DTO:', dto);
      const agentId =
        dto.id ||
        `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const config = {
        id: agentId,
        name: dto.name,
        modelType: dto.modelType,
        modelId: this.getModelId(dto.modelType, dto.modelId),
        contexts: dto.contexts,
        contextArgs: dto.contextArgs,
        instructions: dto.instructions || '',
        mcpConfig: dto.mcpConfig,
        userId, // Add user ID to the config
      };

      const createdId = await this.daydreamsService.createAgent(config);
      return {
        agentId: createdId,
        message: `Agent ${createdId} created successfully`,
      };
    });
  }

  @Delete(':id')
  async deleteAgent(
    @Param('id') agentId: string,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      // Verify ownership before deletion
      const isOwner = await this.daydreamsService.verifyAgentOwnership(
        agentId,
        userId,
      );
      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      await this.daydreamsService.deleteAgent(agentId);
      return {
        success: true,
        message: `Agent ${agentId} deleted successfully`,
      };
    });
  }

  @Put(':id')
  async updateAgent(
    @Param('id') agentId: string,
    @Body() dto: Partial<CreateAgentDto>,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      // Verify ownership before update
      const isOwner = await this.daydreamsService.verifyAgentOwnership(
        agentId,
        userId,
      );
      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      const updated = await this.daydreamsService.updateAgent(agentId, dto);
      return {
        success: true,
        agent: updated,
        message: `Agent ${agentId} updated successfully`,
      };
    });
  }

  private getModelId(modelType: ModelType, modelId: string): ModelId {
    return modelType === 'anthropic'
      ? 'claude-3-7-sonnet-latest'
      : modelId === 'gpt-4.1' || modelId === 'gpt-4.1-nano'
        ? (modelId as OpenAIModelId)
        : 'gpt-4.1';
  }
}
