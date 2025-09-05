import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Res,
  // UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Using global SupabaseAuthGuard now
import { Public } from '../auth/decorators/public.decorator';
import { DaydreamsService } from './daydreams.service';
import { TemplateService } from './template.service';
import { CreateAgentDto } from './dto/agent.dto';
import { ContextTemplate } from './types/context';
import { ModelId, ModelType } from './types/models';
import { SendMessageDto } from '../dto/messages';
import { CreateAgentDto as NewCreateAgentDto } from '../dto/agents';
import { UpdateAgentDto } from '../dto/agents';

// DTO for connecting two agents
export class ConnectAgentsDto {
  sourceAgentId: string;
  targetAgentId: string;
}

// DTO for agent-to-agent messaging
export class AgentMessageDto {
  sourceAgentId: string;
  targetAgentId: string;
  content: string;
}

// DTO for creating an agent from a template
export class CreateAgentFromTemplateDto {
  templateId: string;
  id?: string; // Optional, a random ID will be generated if not provided
  modelType: 'anthropic' | 'openai';
  modelId: string;
  customArgs?: Record<string, unknown>;
}

// DTO for creating a custom template
export class CreateContextTemplateDto {
  id?: string;
  name?: string;
  description?: string;
  content?: string;
  contextType?: string;
  defaultArgs?: Record<string, unknown>;

  // New fields for enhanced templates
  model_type?: string;
  model_id?: string;
  contexts?: string[];
  context_args?: Record<string, any>;
  // capabilities?: string[];
  instructions?: string;
  variables?: Array<{
    name: string;
    description?: string;
    type?: string;
    defaultValue?: any;
    required?: boolean;
    options?: string[];
  }>;
  mcpServers?: string[];
  tags?: string[];
  version?: string;
  example_prompts?: string[];
}

// DTO for updating a template
export class UpdateContextTemplateDto {
  name?: string;
  description?: string;
  content?: string;
  contextType?: string;
  defaultArgs?: Record<string, unknown>;
}

// DTO for creating an agent from a template
export class CreateAgentWithTemplateDto {
  templateId: string;
  variables: Record<string, string>;
  id?: string; // Optional, a random ID will be generated if not provided
  modelType: 'anthropic' | 'openai';
  modelId: string;
}

export class CreateContextDto {
  id: string;
  name: string;
  description: string;
  defaultArgs?: Record<string, unknown>;
}

export class UpdateContextDto {
  name?: string;
  description?: string;
  defaultArgs?: Record<string, unknown>;
}

// === DEPRECATED DTOs - REMOVED ===
// Replaced by direct use of Daydreams memory

@Controller('daydreams')
// @UseGuards(JwtAuthGuard) // Using global SupabaseAuthGuard now
export class DaydreamsController {
  constructor(
    private readonly daydreamsService: DaydreamsService,
    private readonly templateService: TemplateService,
  ) {}

  // Get a specific context
  @Get('contexts/:id')
  getContext(@Param('id') contextId: string) {
    try {
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        return {
          success: false,
          error: `Context ${contextId} not found`,
        };
      }

      // Get basic context details from service
      const contextDetails = this.daydreamsService.getContextDetails(contextId);

      return {
        success: true,
        id: contextId,
        ...contextDetails,
      };
    } catch (error) {
      return {
        success: false,
        error: error?.message || `Error retrieving context ${contextId}`,
      };
    }
  }

  // Create a new context
  @Post('contexts')
  async createContext(@Body() dto: CreateContextDto) {
    try {
      const success = await this.daydreamsService.createContext(
        dto.id,
        dto.name,
        dto.description,
        dto.defaultArgs || {},
      );

      if (success) {
        return {
          success: true,
          message: `Context ${dto.id} created successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to create context ${dto.id}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Failed to create context',
      };
    }
  }

  // Update a context
  @Put('contexts/:id')
  async updateContext(
    @Param('id') contextId: string,
    @Body() dto: UpdateContextDto,
  ) {
    try {
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        return {
          success: false,
          error: `Context ${contextId} not found`,
        };
      }

      const success = await this.daydreamsService.updateContext(
        contextId,
        dto.name,
        dto.description,
        dto.defaultArgs,
      );

      if (success) {
        return {
          success: true,
          message: `Context ${contextId} updated successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to update context ${contextId}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error?.message || `Failed to update context ${contextId}`,
      };
    }
  }

  // Delete a context
  @Delete('contexts/:id')
  async deleteContext(@Param('id') contextId: string) {
    try {
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        return {
          success: false,
          error: `Context ${contextId} not found`,
        };
      }

      // Check if any agent is using this context
      const agentIds = this.daydreamsService.getAgentIds();
      for (const agentId of agentIds) {
        const config = await this.daydreamsService.getAgentConfig(agentId);
        if (config && config.contexts.includes(contextId)) {
          return {
            success: false,
            error: `Cannot delete context ${contextId} because it is being used by agent ${agentId}`,
          };
        }
      }

      const success = await this.daydreamsService.deleteContext(contextId);

      if (success) {
        return {
          success: true,
          message: `Context ${contextId} deleted successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to delete context ${contextId}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error?.message || `Failed to delete context ${contextId}`,
      };
    }
  }

  // Get all agents
  @Get('agents')
  getAgents() {
    const agentIds = this.daydreamsService.getAgentIds();
    const agents = agentIds.map(id => {
      return {
        id,
        config: this.daydreamsService.getAgentConfig(id),
      };
    });

    return { agents };
  }

  // Get a specific agent
  @Get('agents/:id')
  async getAgent(@Param('id') id: string) {
    const config = await this.daydreamsService.getAgentConfig(id);
    if (!config) {
      return {
        success: false,
        error: `Agent ${id} not found`,
      };
    }
    return {
      success: true,
      agent: {
        id,
        config,
      },
    };
  }

  // Get available actions for an agent
  @Get('agents/:id/actions')
  async getAgentActions(@Param('id') agentId: string) {
    try {
      const actions = await this.daydreamsService.getAgentActions(agentId);
      if (!actions) {
        return {
          success: false,
          error: `Agent ${agentId} not found`,
        };
      }
      return {
        success: true,
        agentId,
        actions: actions.map(action => ({
          name: action.name,
          description: action.description || 'No description',
        })),
        count: actions.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || `Failed to get actions for agent ${agentId}`,
      };
    }
  }

  // Get sessions for an agent (DEPRECATED - use /memory/conversations)
  @Get('agents/:id/sessions')
  async getAgentSessions(@Param('id') agentId: string) {
    try {
      // Redirect to the new memory API
      const conversations =
        await this.daydreamsService.getMemoryConversations(agentId);
      return {
        success: true,
        agentId,
        sessions: conversations.map(conv => ({
          id: conv.sessionId,
          title: conv.title,
          agentId: agentId,
          createdAt: conv.createdAt,
          updatedAt: conv.lastInteractionTime,
        })),
        count: conversations.length,
        deprecated:
          'This endpoint is deprecated. Use /agents/:id/memory/conversations instead.',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || `Failed to get sessions for agent ${agentId}`,
      };
    }
  }

  // === OLD DEPRECATED ENDPOINTS - REMOVED ===
  // Replaced by /memory/conversations endpoints

  // === NEW ENDPOINTS USING NATIVE DAYDREAMS MEMORY ===

  // Get conversations from Daydreams memory
  @Get('agents/:id/memory/conversations')
  async getAgentMemoryConversations(@Param('id') agentId: string) {
    try {
      const conversations =
        await this.daydreamsService.getMemoryConversations(agentId);
      return {
        success: true,
        agentId,
        conversations,
        count: conversations.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          `Failed to get memory conversations for agent ${agentId}`,
      };
    }
  }

  // Get messages from a specific conversation in Daydreams memory
  @Get('agents/:agentId/memory/conversations/:sessionId/messages')
  async getMemoryConversationMessages(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      const result = await this.daydreamsService.getMemoryConversationMessages(
        agentId,
        sessionId,
      );
      return {
        success: true,
        agentId,
        sessionId,
        ...result,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          `Failed to get memory messages for session ${sessionId}`,
      };
    }
  }

  // Delete a conversation from Daydreams memory
  @Delete('agents/:agentId/memory/conversations/:sessionId')
  async deleteMemoryConversation(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      await this.daydreamsService.deleteMemoryConversation(agentId, sessionId);
      return {
        success: true,
        message: `Conversation ${sessionId} deleted successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || `Failed to delete conversation ${sessionId}`,
      };
    }
  }

  // Delete a specific agent
  @Delete('agents/:id')
  async deleteAgent(@Param('id') agentId: string) {
    try {
      await this.daydreamsService.deleteAgent(agentId);
      return {
        success: true,
        message: `Agent ${agentId} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Failed to delete agent',
      };
    }
  }

  // Delete all agents
  @Delete('agents')
  async deleteAllAgents() {
    try {
      const deletedCount = await this.daydreamsService.deleteAllAgents();

      return {
        success: true,
        message: `Deleted ${deletedCount} agents successfully`,
        deletedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Failed to delete all agents',
      };
    }
  }

  // DEPRECATED: Agent creation moved to AgentsController with proper validation
  // This endpoint is kept for backward compatibility but should not be used

  /**
   * Helper method to get default model ID based on model type
   */
  private getDefaultModelId(modelType?: string, modelId?: string): ModelId {
    if (modelId) {
      // Pour les anciens modèles, mapper vers les nouveaux
      if (modelId === 'claude-3-7-sonnet-latest') {
        return 'claude-3-5-sonnet-latest' as ModelId;
      }
      if (modelId === 'gpt-4.1' || modelId === 'gpt-4.1-nano') {
        return 'gpt-4' as ModelId;
      }
      return modelId as ModelId;
    }

    return (
      modelType === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4'
    ) as ModelId;
  }

  // Send a message to an agent with streaming
  @Post('agents/:id/stream')
  async streamMessage(
    @Param('id') agentId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Default context to 'chat' if not provided
      const contextId = dto.contextId || 'chat';

      // Get message content from either 'content' or 'message' field for backward compatibility
      const messageContent = dto.content || dto.message;

      if (!messageContent) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            data: {
              error:
                "Message content is required (provide 'content' or 'message')",
            },
          })}\n\n`,
        );
        res.end();
        return;
      }

      // Get context from available contexts
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            data: { error: `Context ${contextId} not found` },
          })}\n\n`,
        );
        res.end();
        return;
      }

      // Get agent config
      const config = await this.daydreamsService.getAgentConfig(agentId);
      if (!config) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            data: { error: `Agent ${agentId} not found` },
          })}\n\n`,
        );
        res.end();
        return;
      }

      // Get context args from agent config or use default
      const baseContextArgs = config.contextArgs[contextId] || {};

      // Add sessionId and userId if provided in the request
      const sessionId =
        dto.sessionId ||
        (baseContextArgs as any).sessionId ||
        `session-${Date.now()}`;
      const userId = dto.userId || (baseContextArgs as any).userId || 'user';

      const enrichedContextArgs = {
        ...baseContextArgs,
        sessionId,
        userId,
        // Add agent instructions and name so the context can use them
        agentInstructions:
          config.instructions || 'You are a helpful AI assistant.',
        agentName: config.name || 'Assistant',
      };

      // Create request - note that context is now a string and the service will resolve it
      const request = {
        context: contextId,
        args: enrichedContextArgs,
        input: {
          type: 'chat',
          data: dto.input?.data || {
            prompt: messageContent, // Use 'prompt' for the chat input
            message: messageContent,
            sender: userId,
          },
        },
      };

      // Send initial event
      res.write(
        `data: ${JSON.stringify({
          type: 'start',
          data: { agentId, sessionId, userId },
        })}\n\n`,
      );

      // Stream the response
      await this.daydreamsService.sendStream(agentId, request, chunk => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });

      // Send end event
      res.write(
        `data: ${JSON.stringify({
          type: 'end',
          data: { completed: true },
        })}\n\n`,
      );

      res.end();
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          data: { error: error?.message || 'Failed to send message' },
        })}\n\n`,
      );
      res.end();
    }
  }

  // Send a message to an agent
  @Post('agents/:id/send')
  async sendMessage(@Param('id') agentId: string, @Body() dto: SendMessageDto) {
    try {
      // Default context to 'chat' if not provided
      const contextId = dto.contextId || 'chat';

      // Get message content from either 'content' or 'message' field for backward compatibility
      const messageContent = dto.content || dto.message;

      if (!messageContent) {
        return {
          success: false,
          error: "Message content is required (provide 'content' or 'message')",
        };
      }

      // Get context from available contexts
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        return {
          success: false,
          error: `Context ${contextId} not found`,
        };
      }

      // Get agent config
      const config = await this.daydreamsService.getAgentConfig(agentId);
      if (!config) {
        return {
          success: false,
          error: `Agent ${agentId} not found`,
        };
      }

      // Get context args from agent config or use default
      const baseContextArgs = config.contextArgs[contextId] || {};

      // Add sessionId and userId if provided in the request
      const sessionId =
        dto.sessionId ||
        (baseContextArgs as any).sessionId ||
        `session-${Date.now()}`;
      const userId = dto.userId || (baseContextArgs as any).userId || 'user';

      const enrichedContextArgs = {
        ...baseContextArgs,
        sessionId,
        userId,
        // Add agent instructions and name so the context can use them
        agentInstructions:
          config.instructions || 'You are a helpful AI assistant.',
        agentName: config.name || 'Assistant',
      };

      console.log('[DEBUG] Enriched context args for message:', {
        agentId,
        contextId,
        sessionId,
        userId,
        agentName: enrichedContextArgs.agentName,
        agentInstructionsLength: enrichedContextArgs.agentInstructions.length,
        agentInstructions:
          enrichedContextArgs.agentInstructions.substring(0, 100) + '...',
      });

      // Create request - note that context is now a string and the service will resolve it
      const request = {
        context: contextId,
        args: enrichedContextArgs,
        input: {
          type: 'chat',
          data: dto.input?.data || {
            prompt: messageContent, // Use 'prompt' for the chat input
            message: messageContent,
            sender: userId,
          },
        },
      };

      // Send request to agent
      const response = await this.daydreamsService.send(agentId, request);

      return {
        success: true,
        response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to send message',
      };
    }
  }

  // Create a communication channel between two agents
  @Post('agents/connect')
  async connectAgents(@Body() dto: ConnectAgentsDto) {
    try {
      const success = await this.daydreamsService.createCommunicationChannel(
        dto.sourceAgentId,
        dto.targetAgentId,
      );

      if (success) {
        return {
          success: true,
          message: `Communication channel created from ${dto.sourceAgentId} to ${dto.targetAgentId}`,
        };
      } else {
        return {
          success: false,
          error: 'Failed to create communication channel',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to connect agents',
      };
    }
  }

  // Send a message from one agent to another
  @Post('agents/message')
  async sendAgentMessage(@Body() dto: AgentMessageDto) {
    try {
      const success = await this.daydreamsService.sendMessageBetweenAgents(
        dto.sourceAgentId,
        dto.targetAgentId,
        { content: dto.content },
      );

      if (success) {
        return {
          success: true,
          message: `Message sent from ${dto.sourceAgentId} to ${dto.targetAgentId}`,
        };
      } else {
        return {
          success: false,
          error: 'Failed to send message between agents',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to send message',
      };
    }
  }

  // Get a specific context template
  @Get('templates/:id')
  async getContextTemplate(@Param('id') templateId: string) {
    try {
      console.log('[DEBUG] Fetching template by ID:', templateId);

      // Try TemplateService first (new enhanced templates)
      const template = await this.templateService.getTemplateById(templateId);
      if (!template) {
        console.log(
          '[DEBUG] Template not found in TemplateService, trying DaydreamsService',
        );
        // Fallback to old context templates
        const contextTemplate =
          await this.daydreamsService.getContextTemplate(templateId);
        if (!contextTemplate) {
          return {
            success: false,
            error: `Template ${templateId} not found`,
          };
        }
        return {
          success: true,
          template: contextTemplate,
        };
      }

      console.log('[DEBUG] Template retrieved from TemplateService:', {
        id: template.id,
        name: template.name,
        hasInstructions: !!template.instructions,
        contexts: template.contexts,
        // capabilities: template.capabilities,
        model_type: template.model_type,
        model_id: template.model_id,
      });

      return {
        success: true,
        template,
      };
    } catch (error) {
      console.error('[ERROR] Failed to get template:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch template',
      };
    }
  }

  // Delete a context template
  @Delete('templates/:id')
  async deleteContextTemplate(@Param('id') templateId: string) {
    try {
      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: `Template ${templateId} not found`,
        };
      }

      // Check if any agent is using this template (future implementation)
      // For now just delete the template

      const success =
        await this.daydreamsService.deleteContextTemplate(templateId);

      if (success) {
        return {
          success: true,
          message: `Template ${templateId} deleted successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to delete template ${templateId}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || `Failed to delete template ${templateId}`,
      };
    }
  }

  // Create a new agent
  @Post('agents')
  async createAgent(
    @Body(
      new ValidationPipe({ transform: false, validateCustomDecorators: false }),
    )
    dto: any,
  ) {
    try {
      console.log(
        '[DEBUG] Raw agent creation DTO:',
        JSON.stringify(dto, null, 2),
      );
      console.log('[DEBUG] Creating agent:', {
        name: dto.name,
        modelType: dto.modelType,
        contextCount: dto.contexts?.length || 0,
        hasTemplateId: !!dto.templateId,
        fullDto: dto,
      });

      // If creating from template, handle specially
      if (dto.templateId) {
        console.log('[DEBUG] Creating agent from template:', dto.templateId);
        try {
          // const agentId = await this.daydreamsService.createAgentFromTemplate( // TODO: Use createAgent with templateId
          const agentId = await this.daydreamsService.createAgent({
            templateId: dto.templateId,
            name: dto.name,
            modelType: dto.modelType,
            modelId: dto.modelId,
            instructions: dto.instructions,
            contexts: dto.contexts,
            contextArgs: dto.contextArgs,
          });

          return {
            success: true,
            agentId,
            message: `Agent ${agentId} created from template successfully`,
          };
        } catch (templateError) {
          console.error(
            '[ERROR] Failed to create agent from template:',
            templateError,
          );
          // Fall back to regular creation
          console.log('[DEBUG] Falling back to regular agent creation');
        }
      }

      const agentConfig = {
        id:
          dto.id ||
          `agent-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: dto.name,
        modelType: dto.modelType,
        modelId: dto.modelId,
        instructions: dto.instructions,
        contexts: dto.contexts,
        contextArgs: dto.contextArgs,
        // capabilities: dto.capabilities,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(
        '[DEBUG] Final agent config for creation:',
        JSON.stringify(agentConfig, null, 2),
      );

      // Use the agent service to create the agent
      const agentId = await this.daydreamsService.createAgent(
        agentConfig as any,
      );

      return {
        success: true,
        agentId,
        message: `Agent ${agentId} created successfully`,
      };
    } catch (error: any) {
      console.error('[ERROR] Failed to create agent:', error);
      console.error('[ERROR] Error stack:', error.stack);
      return {
        success: false,
        error: error?.message || 'Failed to create agent',
      };
    }
  }

  @Post('templates')
  async createContextTemplate(@Body() dto: any) {
    try {
      console.log('[DEBUG] Raw DTO received:', dto);
      console.log('[DEBUG] DTO keys:', Object.keys(dto));
      console.log('[DEBUG] Creating template DTO:', {
        id: dto.id,
        name: dto.name,
        hasContent: !!dto.content,
        contentLength: dto.content ? dto.content.length : 0,
        model_type: dto.model_type,
        contexts: dto.contexts,
        // capabilities: dto.capabilities,
      });

      // Get context from type
      const contextType = dto.contextType;
      const contexts = this.daydreamsService.getAvailableContexts();

      if (!contexts.includes(contextType)) {
        return {
          success: false,
          error: `Context type ${contextType} not found. Available types: ${contexts.join(', ')}`,
        };
      }

      // Create enhanced template object with all database fields
      const template = {
        id: dto.id,
        name: dto.name,
        description: dto.description,

        // Model configuration
        model_type: dto.model_type,
        model_id: dto.model_id,

        // Agent behavior
        instructions: dto.instructions || dto.content || '',
        contexts: dto.contexts,
        context_args: dto.context_args,
        // capabilities: dto.capabilities,

        // Template system
        variables: dto.variables || [],
        example_prompts: dto.example_prompts || [],
        tags: dto.tags || [],
        version: dto.version || '1.0.0',

        // MCP integration (if the column exists)
        mcp_servers: dto.mcpServers || [],

        // Metadata
        status: 'active',
        // owner_id: will be set from JWT user later
        metadata: {},

        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[DEBUG] Enhanced template object created:', {
        id: template.id,
        name: template.name,
        model_type: template.model_type,
        contexts: template.contexts,
        // capabilities: template.capabilities,
      });

      // Use TemplateService for full template with all fields
      const createdId = await this.templateService.createTemplate(
        template as any,
      );
      return {
        success: true,
        templateId: createdId,
        message: `Template ${createdId} created successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to create template',
      };
    }
  }

  // Update a context template
  @Put('templates/:id')
  async updateContextTemplate(
    @Param('id') templateId: string,
    @Body() dto: UpdateContextTemplateDto,
  ) {
    try {
      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: `Template ${templateId} not found`,
        };
      }

      // Create the updated template with the new values
      const updatedTemplate = {
        ...template,
        name: dto.name !== undefined ? dto.name : template.name,
        description:
          dto.description !== undefined
            ? dto.description
            : template.description,
        content: dto.content !== undefined ? dto.content : template.content,
        defaultArgs:
          dto.defaultArgs !== undefined
            ? dto.defaultArgs
            : template.defaultArgs,
      };

      // If contextType is changed, update the context reference
      if (dto.contextType && dto.contextType !== template.context.type) {
        const contexts = this.daydreamsService.getAvailableContexts();
        if (!contexts.includes(dto.contextType)) {
          return {
            success: false,
            error: `Context type ${dto.contextType} not found. Available types: ${contexts.join(', ')}`,
          };
        }
        updatedTemplate.context = { type: dto.contextType } as any;
      }

      const success = this.daydreamsService.updateContextTemplate(
        templateId,
        updatedTemplate,
      );

      if (success) {
        return {
          success: true,
          message: `Template ${templateId} updated successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to update template ${templateId}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || `Failed to update template ${templateId}`,
      };
    }
  }
}
