import { Injectable, Logger } from '@nestjs/common';
import {
  AgentFactory,
  ContextServices,
  ValidationResult,
  EnhancedTemplate,
} from '../types/context-factory';
import { TemplateService, Template } from '../template.service';
import { ContextService } from './context.service';
import { McpService } from './mcp.service';
import { MemoryService } from './memory.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { ModelService } from './model.service';
import { ConfigService } from '@nestjs/config';
import { ChromaService } from '../../knowledge/services/chroma.service';
import { CreateAgentDto } from '../dto/agent.dto';
import { AgentConfig } from '../types/agent';
import { randomUUID } from 'crypto';
import { Agent, AnyContext } from '@daydreamsai/core';

@Injectable()
export class AgentFactoryService implements AgentFactory {
  private readonly logger = new Logger(AgentFactoryService.name);

  constructor(
    private readonly templateService: TemplateService,
    private readonly contextService: ContextService,
    private readonly mcpService: McpService,
    private readonly memoryService: MemoryService,
    private readonly storageService: SupabaseStorageService,
    private readonly modelService: ModelService,
    private readonly configService: ConfigService,
    private readonly chromaService: ChromaService,
  ) {}

  /**
   * Get all available services for context creation
   */
  private getAvailableServices(): ContextServices {
    return {
      mcpService: this.mcpService,
      chromaService: this.chromaService,
      memoryService: this.memoryService,
      storageService: this.storageService,
      modelService: this.modelService,
      configService: this.configService,
      contextService: this.contextService,
    };
  }

  /**
   * Create an agent from a template
   */
  async createFromTemplate(
    templateId: string,
    services?: ContextServices,
    overrides?: Partial<CreateAgentDto>,
  ): Promise<Agent<AnyContext>> {
    this.logger.log(`Creating agent from template: ${templateId}`);

    // Get the template
    const template = await this.getEnhancedTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate template
    const validation = await this.validateTemplate(templateId);
    if (!validation.isValid) {
      throw new Error(
        `Template validation failed: ${validation.errors.join(', ')}`,
      );
    }

    // Use provided services or get all available
    const contextServices = services || this.getAvailableServices();

    // Create agent configuration from template
    const agentConfig = this.createAgentConfigFromTemplate(template, overrides);

    // Create agent using existing daydreams service logic
    return this.createAgentWithConfig(agentConfig, contextServices);
  }

  /**
   * Validate a template for agent creation
   */
  async validateTemplate(templateId: string): Promise<ValidationResult> {
    const template = await this.getEnhancedTemplate(templateId);
    if (!template) {
      return {
        isValid: false,
        errors: [`Template ${templateId} not found`],
        warnings: [],
        missingServices: [],
        availableCapabilities: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const missingServices: string[] = [];
    const availableServices = this.getAvailableServices();

    // Check required services
    if (template.requiredServices) {
      for (const serviceName of template.requiredServices) {
        if (!availableServices[serviceName]) {
          missingServices.push(serviceName);
          errors.push(`Required service '${serviceName}' is not available`);
        }
      }
    }

    // Check context availability
    if (template.contexts) {
      for (const contextId of template.contexts) {
        if (!this.contextService.contextExists(contextId)) {
          errors.push(`Required context '${contextId}' is not available`);
        }
      }
    }

    // Check model availability
    if (template.model_type && template.model_id) {
      try {
        await this.modelService.initializeModel(
          template.model_type as any,
          template.model_id as any,
        );
      } catch (error) {
        errors.push(
          `Model ${template.model_type}:${template.model_id} is not available: ${error.message}`,
        );
      }
    }

    // Get available capabilities
    const availableCapabilities = template.contexts
      ? template.contexts.flatMap(contextId =>
          this.getContextCapabilities(contextId, availableServices),
        )
      : [];

    // Check if template capabilities match available ones
    // if (template.capabilities) {
    //   for (const capability of template.capabilities) {
    //     if (!availableCapabilities.includes(capability)) {
    //       warnings.push(`Capability '${capability}' may not be available`);
    //     }
    //   }
    // }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingServices,
      availableCapabilities,
    };
  }

  /**
   * Get available capabilities for a template
   */
  async getTemplateCapabilities(templateId: string): Promise<string[]> {
    const template = await this.getEnhancedTemplate(templateId);
    if (!template) {
      return [];
    }

    const availableServices = this.getAvailableServices();
    const capabilities: string[] = [];

    // Get capabilities from contexts
    if (template.contexts) {
      for (const contextId of template.contexts) {
        const contextCapabilities = this.getContextCapabilities(
          contextId,
          availableServices,
        );
        capabilities.push(...contextCapabilities);
      }
    }

    // Add template-specific capabilities
    // if (template.capabilities) {
    //   capabilities.push(...template.capabilities);
    // }

    // Remove duplicates
    return [...new Set(capabilities)];
  }

  /**
   * Preview what an agent would look like from a template
   */
  async previewFromTemplate(
    templateId: string,
    overrides?: Record<string, any>,
  ): Promise<any> {
    const template = await this.getEnhancedTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const agentConfig = this.createAgentConfigFromTemplate(template, overrides);
    const validation = await this.validateTemplate(templateId);
    const capabilities = await this.getTemplateCapabilities(templateId);

    return {
      id: agentConfig.id,
      name: agentConfig.name,
      description: agentConfig.description,
      modelType: agentConfig.modelType,
      modelId: agentConfig.modelId,
      contexts: agentConfig.contexts,
      contextArgs: agentConfig.contextArgs,
      capabilities,
      validation,
      estimatedTokens: this.estimateTemplateTokens(template),
    };
  }

  /**
   * Get enhanced template with factory information
   */
  private async getEnhancedTemplate(
    templateId: string,
  ): Promise<EnhancedTemplate | null> {
    // First try from template service
    const templates = await this.templateService.getAllTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return null;
    }

    // Enhance template with factory information
    const enhanced: EnhancedTemplate = {
      ...template,
      contextType: template.contexts?.[0] || 'chat',
      requiredServices: this.inferRequiredServices(template),
      dynamicCapabilities: true,
    };

    // Add context factory if we can infer one
    if (enhanced.contextType === 'linear') {
      enhanced.requiredServices = ['mcpService'];
      enhanced.contextFactory = (services: ContextServices) => {
        // Import and create linear context with actions
        const {
          createLinearContextWithActions,
        } = require('../context/linear.context');
        return createLinearContextWithActions(services.mcpService);
      };
    }

    return enhanced;
  }

  /**
   * Infer required services from template configuration
   */
  private inferRequiredServices(template: Template): string[] {
    const services: string[] = [];

    // Always need basic services
    services.push('modelService', 'memoryService');

    // Check contexts for specific service requirements
    if (template.contexts) {
      if (template.contexts.includes('linear')) {
        services.push('mcpService');
      }
      if (template.contexts.includes('notion')) {
        services.push('mcpService');
      }
      if (template.contexts.some(c => c.includes('knowledge'))) {
        services.push('chromaService');
      }
    }

    // Check capabilities for service requirements
    // if (template.capabilities) {
    //   if (template.capabilities.some(c => c.includes('mcp') || c.includes('linear'))) {
    //     services.push('mcpService');
    //   }
    //   if (template.capabilities.some(c => c.includes('knowledge') || c.includes('search'))) {
    //     services.push('chromaService');
    //   }
    // }

    return [...new Set(services)];
  }

  /**
   * Create agent configuration from template
   */
  private createAgentConfigFromTemplate(
    template: EnhancedTemplate,
    overrides?: Partial<CreateAgentDto>,
  ): AgentConfig {
    const baseConfig: AgentConfig = {
      id: overrides?.id || `${template.id}-${Date.now()}`,
      modelType: (overrides?.modelType ||
        template.model_type ||
        'anthropic') as any,
      modelId: (overrides?.modelId ||
        template.model_id ||
        'claude-3-5-sonnet-latest') as any,
      name: overrides?.name || template.name,
      description: overrides?.description || template.description,
      instructions: overrides?.instructions || template.instructions,
      contexts: overrides?.contexts || template.contexts || ['chat'],
      contextArgs: {
        ...template.context_args,
        ...overrides?.contextArgs,
      },
      // capabilities: template.capabilities || [],
      capabilities: [],
      stats: {
        totalConversations: 0,
        averageResponseTime: 0,
        successRate: 1.0,
        lastActive: new Date().toISOString(),
      },
      status: 'active',
    };

    return baseConfig;
  }

  /**
   * Get capabilities for a specific context
   */
  private getContextCapabilities(
    contextId: string,
    services: ContextServices,
  ): string[] {
    const capabilities: string[] = [];

    switch (contextId) {
      case 'chat':
        capabilities.push('chat', 'conversation', 'memory');
        break;
      case 'linear':
        if (services.mcpService) {
          capabilities.push(
            'linear',
            'project-management',
            'issue-tracking',
            'mcp',
            'team-collaboration',
          );
        }
        break;
      case 'notion':
        if (services.mcpService) {
          capabilities.push(
            'notion',
            'documentation',
            'knowledge-base',
            'mcp',
            'content-management',
          );
        }
        break;
      default:
        capabilities.push(contextId);
    }

    return capabilities;
  }

  /**
   * Estimate token usage for a template
   */
  private estimateTemplateTokens(template: Template): number {
    let tokens = 0;

    // Base instructions
    if (template.instructions) {
      tokens += Math.ceil(template.instructions.length / 4); // Rough estimate: 4 chars per token
    }

    // Context overhead
    tokens += (template.contexts?.length || 1) * 100; // ~100 tokens per context

    // Variable processing overhead
    tokens += (template.variables?.length || 0) * 50; // ~50 tokens per variable

    return tokens;
  }

  /**
   * Create agent with configuration (integrates with existing DaydreamsService logic)
   */
  private async createAgentWithConfig(
    agentConfig: AgentConfig,
    services: ContextServices,
  ): Promise<Agent<AnyContext>> {
    // This would integrate with the existing DaydreamsService.initializeAgent method
    // For now, we'll simulate the process

    // Initialize model
    const model = await this.modelService.initializeModel(
      agentConfig.modelType,
      agentConfig.modelId,
    );

    // Get contexts
    const contexts = agentConfig.contexts
      .map(contextId => {
        if (contextId === 'linear' && services.mcpService) {
          // Create Linear context with MCP actions
          const {
            createLinearContextWithActions,
          } = require('../context/linear.context');
          return createLinearContextWithActions(services.mcpService);
        }

        // Default to registered contexts
        return this.contextService.getContext(contextId);
      })
      .filter(Boolean);

    if (contexts.length === 0) {
      throw new Error('No valid contexts found for agent');
    }

    // Create agent (this would use the actual DaydreamsService logic)
    const { createDreams } = require('@daydreamsai/core');

    const dreams = createDreams({
      model,
      memory: await this.memoryService.initializeMemory(),
      logger: {
        level: 'info' as any,
        output: console.log,
      },
    });

    const agent = dreams.agent({
      contexts,
    });

    // Store agent configuration
    await this.storageService.createAgent(agentConfig);

    this.logger.log(`Agent created successfully: ${agentConfig.id}`);
    return agent;
  }
}
