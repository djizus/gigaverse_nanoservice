import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createDreams,
  LogLevel,
  Agent,
  AnyContext,
  BaseMemory,
} from '@daydreamsai/core';
import {
  chatContextWithActions,
  chatContext,
} from './context/chat-with-actions.context';
import { chatActions } from './actions/chat-actions';
import { apiInput } from './inputs/chat.input';
import { chatOutput } from './outputs/chat.output';
import { TemplateService, Template } from './template.service';
// import { queryChroma } from "../utils/knowledge-chroma"; // Removed - replaced by knowledge module
import {
  ModelId,
  ModelType,
  AnthropicModelId,
  OpenAIModelId,
} from './types/models';
import { AgentConfig, AgentStats } from './types/agent';
import { CreateAgentDto } from './dto/agent.dto';
import { ContextTemplate } from './types/context';
import { ModelService } from './services/model.service';
import { MemoryService } from './services/memory.service';
import { ContextService } from './services/context.service';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { McpService } from './services/mcp.service';
import { MessageService } from './services/message.service';
import { StreamingService } from './services/streaming.service';

export interface AgentResponse {
  ref: string;
  content: string;
  type?: string;
}

export interface MessageData {
  content: string;
  [key: string]: unknown;
}

export interface AgentRequest {
  context: AnyContext | string;
  args: Record<string, unknown>;
  input: {
    type: string;
    data: Record<string, unknown>;
  };
}

@Injectable()
export class DaydreamsService implements OnModuleInit {
  private agents: Map<string, Agent<AnyContext>> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();
  private agentStats: Map<string, AgentStats> = new Map();
  private availableContexts: Map<string, AnyContext> = new Map();
  private memory: BaseMemory;

  constructor(
    private templateService: TemplateService,
    private modelService: ModelService,
    private memoryService: MemoryService,
    private contextService: ContextService,
    private storageService: SupabaseStorageService,
    private mcpService: McpService,
    private messageService: MessageService,
    private streamingService: StreamingService,
  ) {}

  async onModuleInit() {
    try {
      if (this.memoryService) {
        this.memory = await this.memoryService.initializeMemory();
      } else {
        console.warn('[WARN] Memory service not available');
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize memory service:', error);
      // Continue without memory if initialization fails
    }

    await this.registerAvailableContexts();

    try {
      const storedAgents = await this.storageService.findAllAgents();

      for (const agentConfig of storedAgents) {
        try {
          // Check if all contexts are available before initializing
          const missingContexts = agentConfig.contexts.filter(
            (contextId: string) => !this.availableContexts.has(contextId),
          );

          if (missingContexts.length > 0) {
            console.warn(
              `[WARN] Agent ${agentConfig.id} requires contexts that are not available: ${missingContexts.join(', ')}. Skipping agent initialization.`,
            );
            continue;
          }

          const agent = await this.initializeAgent({
            id: agentConfig.id,
            config: agentConfig,
            contexts: agentConfig.contexts.map((contextId: string) =>
              this.getContextInstance(contextId),
            ),
          });
          this.agents.set(agentConfig.id, agent);
          this.agentConfigs.set(agentConfig.id, agentConfig);
        } catch (agentError) {
          console.error(
            `[ERROR] Failed to load agent ${agentConfig.id}:`,
            agentError,
          );
        }
      }

      console.log(`[INFO] Loaded ${this.agents.size} agents`);
    } catch (error) {
      console.error('[ERROR] Failed to load agents from database:', error);
    }
  }

  private async registerAvailableContexts() {
    // Enregistrer le contexte de chat par défaut avec ses actions
    this.availableContexts.set('chat', chatContextWithActions);
    // Alias pour compatibilité arrière
    this.availableContexts.set('chat-with-actions', chatContextWithActions);
  }

  private async initializeAgent(params: {
    id: string;
    config: AgentConfig;
    contexts: AnyContext[];
  }): Promise<Agent<AnyContext>> {
    const model = await this.modelService.initializeModel(
      params.config.modelType,
      params.config.modelId,
    );

    console.log('[DEBUG] Initializing agent:', {
      id: params.id,
      name: params.config.name,
      mcpEnabled: !!params.config.mcpConfig?.enabled,
    });

    // Initialize MCP servers and actions
    await this.initializeMcpForAgent(params.config);
    const allActions = await this.getActionsForAgent(params.config);

    // Create context with actions
    const contextWithActions = chatContext
      .setActions(allActions)
      .setInputs({ chat: apiInput })
      .setOutputs({ 'chat:response': chatOutput });

    // Create Dreams instance
    const dreams = createDreams({
      model,
      memory: this.memory,
      contexts: [contextWithActions],
      inputs: { chat: apiInput },
      outputs: { 'chat:response': chatOutput },
      extensions: [],
      logLevel: LogLevel.INFO,
    });

    // Start agent with context args
    const contextArgs = this.buildContextArgs(params.config);
    return dreams.start(contextArgs);
  }

  private async initializeMcpForAgent(config: AgentConfig): Promise<void> {
    if (!config.mcpConfig?.enabled || !config.mcpConfig.servers.length) {
      return;
    }

    console.log(
      `[DEBUG] Initializing ${config.mcpConfig.servers.length} MCP servers`,
    );

    for (const serverConfig of config.mcpConfig.servers) {
      if (serverConfig.enabled !== false) {
        try {
          await this.mcpService.connectToServer(serverConfig);
          console.log(
            `[DEBUG] Connected to MCP server: ${serverConfig.name || serverConfig.id}`,
          );
        } catch (error) {
          console.error(
            `[ERROR] Failed to connect to MCP server ${serverConfig.name || serverConfig.id}:`,
            error,
          );
        }
      }
    }
  }

  private async getActionsForAgent(config: AgentConfig): Promise<any[]> {
    const actions: any[] = [...chatActions];

    // Check if MCP is enabled for this agent
    if (config.mcpConfig?.enabled) {
      // Use core MCP actions with better serverId handling
      const { createCoreMcpActions } = await import(
        './actions/mcp-core-actions'
      );
      const mcpActions = createCoreMcpActions(this.mcpService);
      actions.push(...mcpActions);
      console.log(
        `[DEBUG] Added ${mcpActions.length} core MCP actions for agent: ${config.name}`,
      );
    }

    return actions;
  }

  private buildContextArgs(config: AgentConfig): any {
    const firstContextId = config.contexts[0];
    const instructions =
      config.instructions || 'You are a helpful AI assistant.';

    return {
      sessionId: config.contextArgs[firstContextId]?.sessionId || 'default',
      userId: config.contextArgs[firstContextId]?.userId || 'default',
      agentInstructions: instructions,
      agentName: config.name || 'Assistant',
    };
  }

  private getContextInstance(contextId: string): AnyContext {
    const context = this.availableContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }
    return context;
  }

  async sendStream(
    agentId: string,
    request: AgentRequest,
    onChunk: (chunk: any) => void,
  ): Promise<void> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      console.warn(`[WARN] Agent ${agentId} not found`);
      onChunk({
        type: 'error',
        data: {
          ref: 'output',
          content: `Agent ${agentId} not found`,
          type: 'error',
        },
      });
      return;
    }

    // Resolve context if string
    if (typeof request.context === 'string') {
      const contextObj = await this.getContextWithActions(
        agentId,
        request.context,
      );
      if (contextObj) {
        request = { ...request, context: contextObj };
      } else {
        onChunk({
          type: 'error',
          data: { error: `Context ${request.context} not found` },
        });
        return;
      }
    }

    // Use MessageService for streaming
    await this.messageService.streamMessage(agent, agentId, request, {
      onChunk,
    });
  }

  async send(agentId: string, request: AgentRequest): Promise<AgentResponse[]> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      console.warn(`[WARN] Agent ${agentId} not found`);
      return [
        {
          ref: 'output',
          content: `Agent ${agentId} not found`,
          type: 'error',
        },
      ];
    }

    // Resolve context if string
    if (typeof request.context === 'string') {
      const contextObj = await this.getContextWithActions(
        agentId,
        request.context,
      );
      if (contextObj) {
        request = { ...request, context: contextObj };
      } else {
        return [
          {
            ref: 'output',
            content: `Context ${request.context} not found`,
            type: 'error',
          },
        ];
      }
    }

    // Use MessageService for sending
    return await this.messageService.sendMessage(agent, agentId, request);
  }

  getAvailableContexts(): string[] {
    return Array.from(this.availableContexts.keys());
  }

  async createContext(
    id: string,
    name: string,
    description: string,
    defaultArgs: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (this.availableContexts.has(id)) {
      throw new Error(`Context with ID ${id} already exists`);
    }
    const baseContext = this.availableContexts.get('chat');
    if (!baseContext) {
      throw new Error('Base chat context not available');
    }
    this.availableContexts.set(id, baseContext);
    console.log(`[INFO] Created new context: ${id}`);
    return true;
  }

  async updateContext(
    id: string,
    name?: string,
    description?: string,
    defaultArgs?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.availableContexts.has(id)) {
      throw new Error(`Context ${id} not found`);
    }
    console.log(`[INFO] Updated context: ${id}`);
    return true;
  }

  async deleteContext(id: string): Promise<boolean> {
    if (!this.availableContexts.has(id)) {
      throw new Error(`Context ${id} not found`);
    }
    if (id === 'chat') {
      throw new Error('Cannot delete system context: chat');
    }
    this.availableContexts.delete(id);
    console.log(`[INFO] Deleted context: ${id}`);
    return true;
  }

  async createCommunicationChannel(
    sourceAgentId: string,
    targetAgentId: string,
  ): Promise<boolean> {
    console.log(
      `[INFO] Communication channels deprecated - use direct messaging instead`,
    );
    return true;
  }

  async sendMessageBetweenAgents(
    sourceAgentId: string,
    targetAgentId: string,
    message: any,
  ): Promise<boolean> {
    console.log(`[INFO] Agent-to-agent messaging deprecated`);
    return false;
  }

  getContextDetails(contextId: string): Record<string, any> {
    if (!this.availableContexts.has(contextId)) {
      throw new Error(`Context ${contextId} not found`);
    }
    return {
      name: contextId,
      description: `Context for ${contextId}`,
      defaultArgs: {},
    };
  }

  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    // Essayer d'abord de récupérer depuis la mémoire
    let config = this.agentConfigs.get(agentId);

    // Si pas en mémoire, essayer depuis Supabase
    if (!config) {
      try {
        config = await this.storageService.findAgentById(agentId);
        if (config) {
          this.agentConfigs.set(agentId, config);
        }
      } catch (error) {
        console.error(
          `[ERROR] Failed to fetch agent config from database for ${agentId}:`,
          error,
        );
      }
    }

    return config || null;
  }

  async getAgent(agentId: string) {
    const config = await this.getAgentConfig(agentId);
    if (!config) {
      return null;
    }
    return { id: agentId, config };
  }

  async getAgentActions(agentId: string): Promise<any[] | null> {
    const config = this.agentConfigs.get(agentId);
    if (!config) {
      return null;
    }

    return this.getActionsForAgent(config);
  }

  async deleteAllAgents(): Promise<number> {
    try {
      const agentIds = Array.from(this.agents.keys());
      let deletedCount = 0;

      for (const agentId of agentIds) {
        try {
          await this.deleteAgent(agentId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete agent ${agentId}:`, error);
        }
      }

      console.log(`[INFO] Deleted ${deletedCount}/${agentIds.length} agents`);
      return deletedCount;
    } catch (error) {
      console.error('[ERROR] Failed to delete all agents:', error);
      return 0;
    }
  }

  // 🎯 Templates - utilise directement le TemplateService existant
  async getContextTemplates(): Promise<ContextTemplate[]> {
    // Récupérer directement depuis le ContextService qui a les templates pré-configurés
    return this.contextService.getAllContextTemplates();
  }

  // Obtenir un template de contexte spécifique
  async getContextTemplate(
    templateId: string,
  ): Promise<ContextTemplate | null> {
    return this.contextService.getContextTemplate(templateId);
  }

  // Supprimer un template de contexte
  async deleteContextTemplate(templateId: string): Promise<boolean> {
    return await this.templateService.deleteTemplate(templateId);
  }

  // Mettre à jour un template de contexte existant
  async updateContextTemplate(
    templateId: string,
    updatedTemplate: ContextTemplate,
  ): Promise<boolean> {
    const templateForService: Template = {
      id: templateId,
      name: updatedTemplate.name,
      description: updatedTemplate.description,
      instructions: updatedTemplate.content || '',
      variables: updatedTemplate.variables || [],
      context_args: updatedTemplate.defaultArgs,
    };

    return await this.templateService.updateTemplate(
      templateId,
      templateForService,
    );
  }

  // Créer un nouveau template de contexte personnalisé
  async createContextTemplate(template: ContextTemplate): Promise<string> {
    const templateForService: Template = {
      id: template.id,
      name: template.name,
      description: template.description,
      instructions: template.content || '',
      variables: template.variables || [],
      context_args: template.defaultArgs,
    };

    return await this.templateService.createTemplate(templateForService);
  }

  async createAgent(config: CreateAgentDto): Promise<string> {
    const agentId = `agent-${randomUUID()}`;
    console.log('[DEBUG] Config MCP:', {
      mcpConfig: config,
      mcpConfigEnabled: config.mcpConfig?.enabled,
      mcpConfigServers: config.mcpConfig?.servers,
    });

    console.log('[DEBUG] Creating agent:', {
      id: agentId,
      templateId: config.templateId,
      modelType: config.modelType,
    });

    let finalConfig = config;

    // 🎯 Si templateId fourni, charger le template et fusionner
    if (config.templateId) {
      const template = await this.templateService.getTemplateById(
        config.templateId,
      );
      if (!template) {
        throw new Error(`Template '${config.templateId}' not found`);
      }

      console.log('[DEBUG] Template found:', {
        id: template.id,
        name: template.name,
        hasInstructions: !!template.instructions,
        instructionsLength: template.instructions?.length || 0,
      });

      console.log('[DEBUG] Config instructions:', {
        hasInstructions: !!config.instructions,
        instructionsLength: config.instructions?.length || 0,
        instructions: config.instructions,
      });

      // Instructions : utiliser celles du config si présentes, sinon celles du template
      const mergedInstructions = config.instructions || template.instructions;

      // Fusionner template avec config fournie (config override le template)
      finalConfig = {
        modelType:
          config.modelType || (template.model_type as any) || 'anthropic',
        modelId:
          config.modelId ||
          (template.model_id as any) ||
          'claude-3-7-sonnet-latest',
        name: config.name || template.name,
        description: config.description || template.description,
        instructions: mergedInstructions,
        contexts: config.contexts || template.contexts || ['chat'],
        mcpConfig: config.mcpConfig || { enabled: false, servers: [] },
        maxSteps: 1,
        contextArgs: config.contextArgs ||
          template.context_args || {
            chat: {
              sessionId: randomUUID(),
              userId: 'default',
              ...config.customArgs,
            },
          },
      };

      console.log('[DEBUG] Final merged instructions:', {
        finalInstructions: finalConfig.instructions?.substring(0, 100) + '...',
        finalInstructionsLength: finalConfig.instructions?.length || 0,
      });
    }

    // Valider les champs requis
    if (!finalConfig.contexts || finalConfig.contexts.length === 0) {
      finalConfig.contexts = ['chat'];
    }
    if (!finalConfig.contextArgs) {
      finalConfig.contextArgs = {
        chat: { sessionId: randomUUID(), userId: 'default' },
      };
    }

    // Créer la configuration complète de l'agent
    const agentConfig: AgentConfig = {
      id: agentId,
      modelType: finalConfig.modelType,
      modelId: finalConfig.modelId,
      name: finalConfig.name || 'Assistant',
      description: finalConfig.description || 'An AI assistant',
      instructions: finalConfig.instructions || 'Be helpful and concise',
      contexts: finalConfig.contexts,
      mcpConfig: finalConfig.mcpConfig,
      contextArgs: {},
      status: 'active',
      capabilities: ['Chat Interaction'],
      maxSteps: 1,
      stats: {
        totalConversations: 0,
        averageResponseTime: 0,
        successRate: 100,
        lastActive: new Date().toISOString(),
      },
    };

    // Copier les contextArgs
    for (const [contextId, args] of Object.entries(finalConfig.contextArgs)) {
      agentConfig.contextArgs[contextId] = args;
    }

    // Ajouter l'userId si fourni
    if (finalConfig.userId) {
      (agentConfig as any).userId = finalConfig.userId;
    }

    // Sauvegarder et initialiser l'agent
    await this.storageService.createAgent(agentConfig);

    const agent = await this.initializeAgent({
      id: agentId,
      config: agentConfig,
      contexts: agentConfig.contexts.map(contextId =>
        this.getContextInstance(contextId),
      ),
    });

    this.agents.set(agentId, agent);
    this.agentConfigs.set(agentId, agentConfig);

    console.log('[DEBUG] Agent created successfully:', agentId);
    return agentId;
  }

  /**
   * Create custom MCP actions that properly interface with our McpService
   */
  private async getContextWithActions(
    agentId: string,
    contextId: string,
  ): Promise<AnyContext | null> {
    const baseContext = this.availableContexts.get(contextId);
    if (!baseContext) {
      return null;
    }

    const agentConfig = this.agentConfigs.get(agentId);
    if (!agentConfig) {
      return baseContext;
    }

    try {
      const allActions = await this.getActionsForAgent(agentConfig);

      return baseContext
        .setActions(allActions)
        .setInputs({ chat: apiInput })
        .setOutputs({ 'chat:response': chatOutput });
    } catch (error) {
      console.error(`[ERROR] Failed to enhance context ${contextId}:`, error);
      return baseContext;
    }
  }

  /**
   * Récupérer toutes les conversations depuis la mémoire Daydreams
   */
  async getMemoryConversations(agentId: string): Promise<any[]> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // TEMPORARY FIX: Use Supabase fallback by default since messages are saved there
      // The Daydreams memory store is not currently being used for message persistence
      return this.getMemoryConversationsFallback(agentId);
    } catch (error) {
      console.error(
        `[ERROR] Failed to get memory conversations for agent ${agentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Méthode de fallback utilisant le système de storage Supabase existant
   */
  private async getMemoryConversationsFallback(
    agentId?: string,
  ): Promise<any[]> {
    try {
      const sessions =
        await this.storageService.findChatSessionsFromConversations(agentId);
      return sessions.map(session => ({
        sessionId: session.id,
        title: session.name,
        lastInteractionTime: session.updatedAt,
        messageCount: session.messageCount || 0,
        tags: session.tags || [],
        isActive: session.isActive !== false,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      console.warn('[WARN] Fallback method also failed:', error);
      return [];
    }
  }

  /**
   * Récupérer les messages d'une conversation depuis la mémoire Daydreams
   */
  async getMemoryConversationMessages(
    agentId: string,
    sessionId: string,
  ): Promise<{
    messages: any[];
    sessionInfo: any;
  }> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // TEMPORARY FIX: Use Supabase fallback by default since messages are saved there
      return this.getMemoryConversationMessagesFallback(sessionId);
    } catch (error) {
      console.error(
        `[ERROR] Failed to get memory messages for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Méthode de fallback pour récupérer les messages depuis Supabase
   */
  private async getMemoryConversationMessagesFallback(
    sessionId: string,
  ): Promise<{
    messages: any[];
    sessionInfo: any;
  }> {
    try {
      const messages =
        await this.storageService.findMessagesFromConversations(sessionId);
      return {
        messages,
        sessionInfo: {
          title: `Session ${sessionId}`,
          tags: [],
          messageCount: messages.length,
          exists: messages.length > 0,
        },
      };
    } catch (error) {
      console.warn('[WARN] Fallback messages method failed:', error);
      return {
        messages: [],
        sessionInfo: {
          title: `Session ${sessionId}`,
          tags: [],
          messageCount: 0,
          exists: false,
        },
      };
    }
  }

  /**
   * Supprimer une conversation de la mémoire Daydreams
   */
  async deleteMemoryConversation(
    agentId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      await this.storageService.deleteChatSession(sessionId);

      console.log(`[DEBUG] Deleted conversation ${sessionId} from memory`);
    } catch (error) {
      console.error(
        `[ERROR] Failed to delete memory conversation ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  // Message handling methods moved to MessageService

  /**
   * Get agents by user ID
   */
  async getAgentsByUserId(userId: string): Promise<AgentConfig[]> {
    try {
      const agents = await this.storageService.findAgentsByUserId(userId);
      return agents;
    } catch (error) {
      console.error(`[ERROR] Failed to get agents for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Verify agent ownership
   */
  async verifyAgentOwnership(
    agentId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const agent = await this.storageService.findAgentById(agentId);
      if (!agent) {
        return false;
      }
      return (agent as any).userId === userId;
    } catch (error) {
      console.error(`[ERROR] Failed to verify agent ownership:`, error);
      return false;
    }
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    updateDto: Partial<CreateAgentDto>,
  ): Promise<AgentConfig | null> {
    try {
      const updated = await this.storageService.updateAgent(
        agentId,
        updateDto as any,
      );
      if (updated) {
        // Update in-memory config if agent is loaded
        if (this.agentConfigs.has(agentId)) {
          this.agentConfigs.set(agentId, updated);
        }
      }
      return updated;
    } catch (error) {
      console.error(`[ERROR] Failed to update agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      // Remove from memory
      this.agents.delete(agentId);
      this.agentConfigs.delete(agentId);
      this.agentStats.delete(agentId);

      // Delete from storage
      await this.storageService.deleteAgent(agentId);

      console.log(`[DEBUG] Agent ${agentId} deleted successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to delete agent ${agentId}:`, error);
      throw error;
    }
  }
}
