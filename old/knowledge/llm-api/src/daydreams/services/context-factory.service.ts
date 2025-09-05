import { Injectable, Logger } from '@nestjs/common';
import { AnyContext } from '@daydreamsai/core';
import {
  ContextFactory,
  ContextServices,
  ValidationResult,
  EnhancedTemplate,
  ContextTypeMetadata,
  FactoryConfig,
} from '../types/context-factory';
import { McpService } from './mcp.service';
import { chatContext } from '../context/chat.context';

@Injectable()
export class ContextFactoryService implements ContextFactory {
  private readonly logger = new Logger(ContextFactoryService.name);
  private readonly contextTypes = new Map<string, ContextTypeMetadata>();
  private readonly contextCache = new Map<string, AnyContext>();
  private readonly config: FactoryConfig;

  constructor(private readonly mcpService: McpService) {
    this.config = {
      enableDynamicCapabilities: true,
      enableContextValidation: true,
      enableServiceDiscovery: true,
      cacheContextInstances: true,
      maxCacheSize: 100,
    };

    this.initializeBuiltInContextTypes();
  }

  /**
   * Initialize built-in context types
   */
  private initializeBuiltInContextTypes(): void {
    // Register chat context
    this.registerContextType('chat', {
      type: 'chat',
      name: 'Chat Context',
      description: 'Basic conversation context with message history',
      requiredServices: ['memoryService'],
      factory: () => chatContext,
      supportedCapabilities: ['chat', 'memory'],
      defaultArgs: {
        sessionId: `chat-${Date.now()}`,
        userId: 'user',
      },
    });

    // Register Linear context
    this.registerContextType('linear', {
      type: 'linear',
      name: 'Linear Context',
      description: 'Linear project management integration context',
      requiredServices: ['mcpService'],
      factory: (services: ContextServices) => {
        const {
          createLinearContextWithActions,
        } = require('../context/linear.context');
        return createLinearContextWithActions(services.mcpService);
      },
      supportedCapabilities: [
        'linear',
        'issue-tracking',
        'project-management',
        'mcp',
      ],
      defaultArgs: {
        sessionId: `linear-${Date.now()}`,
        userId: 'user',
        autoConnect: true,
      },
    });

    this.logger.log('Built-in context types initialized');
  }

  /**
   * Create a context instance from a template
   */
  async createFromTemplate(
    template: EnhancedTemplate,
    services: ContextServices,
    overrides?: Record<string, any>,
  ): Promise<AnyContext> {
    this.logger.log(`Creating context from template: ${template.id}`);

    // Validate template first
    const validation = this.validateTemplate(template, services);
    if (!validation.isValid) {
      throw new Error(
        `Template validation failed: ${validation.errors.join(', ')}`,
      );
    }

    // Use custom factory if available
    if (template.contextFactory) {
      return template.contextFactory(services);
    }

    // Check if template has custom context configuration
    if (template.instructions /* && template.capabilities */) {
      this.logger.log(
        `Creating dynamic context for template: ${template.name}`,
      );
      return this.createDynamicContextFromTemplate(template, services);
    }

    // Use registered context type factory
    if (this.isContextTypeSupported(template.contextType)) {
      const metadata = this.contextTypes.get(template.contextType);
      if (metadata) {
        return metadata.factory(services);
      }
    }

    // Fallback to chat context
    this.logger.warn(
      `No factory found for context type ${template.contextType}, using chat context`,
    );
    return chatContext;
  }

  /**
   * Create a dynamic context based on template configuration
   */
  private createDynamicContextFromTemplate(
    template: EnhancedTemplate,
    services: ContextServices,
  ): AnyContext {
    const { Context } = require('@daydreamsai/core');

    // Create a custom context based on template configuration
    return Context({
      type: `template-${template.id}`,

      onRun: async state => {
        state.templateId = template.id;
        state.templateName = template.name;
        state.instructions = template.instructions;
        // state.capabilities = template.capabilities || [];
        state.capabilities = [];

        // Initialize MCP if needed
        // if (template.capabilities?.includes('linear') && services.mcpService) {
        if (false) {
          // Disabled capabilities check
          try {
            await services.mcpService.connectLinearServer();
            state.mcpConnected = true;
          } catch (error) {
            this.logger.warn(`MCP connection failed: ${error.message}`);
          }
        }
      },

      onStep: async (state, setNext) => {
        // Use template instructions as system prompt
        setNext({
          role: 'system',
          content: template.instructions || 'You are a helpful assistant.',
        });

        if (state.message) {
          setNext({
            role: 'user',
            content: state.message,
          });
        }
      },

      shouldContinue: state => state.continueConversation !== false,
    });
  }

  /**
   * Validate if a template can be instantiated with available services
   */
  validateTemplate(
    template: EnhancedTemplate,
    availableServices: ContextServices,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingServices: string[] = [];

    // Check if context type is supported
    if (!this.isContextTypeSupported(template.contextType)) {
      errors.push(`Context type '${template.contextType}' is not supported`);
    }

    // Check required services
    for (const serviceName of template.requiredServices) {
      if (!availableServices[serviceName]) {
        missingServices.push(serviceName);
        errors.push(`Required service '${serviceName}' is not available`);
      }
    }

    // Validate capabilities if dynamic capabilities are enabled
    let availableCapabilities: string[] = [];
    // Capabilities disabled for now
    if (false) {
      // Get static capabilities for context type
      const contextMetadata = this.contextTypes.get(template.contextType);
      availableCapabilities = contextMetadata?.supportedCapabilities || [];
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingServices,
      availableCapabilities,
    };
  }

  /**
   * Get available capabilities for a context type
   */
  getAvailableCapabilities(
    contextType: string,
    services: ContextServices,
  ): string[] {
    if (!this.config.enableDynamicCapabilities) {
      const metadata = this.contextTypes.get(contextType);
      return metadata?.supportedCapabilities || [];
    }

    // return this.capabilityRegistry.getAvailableCapabilities([contextType], services);
    return []; // Capabilities disabled
  }

  /**
   * Register a context type with its factory function
   */
  registerContextType(
    contextType: string,
    metadata: ContextTypeMetadata,
  ): void {
    this.contextTypes.set(contextType, metadata);
    this.logger.log(`Registered context type: ${contextType}`);
  }

  /**
   * Check if a context type is supported
   */
  isContextTypeSupported(contextType: string): boolean {
    return this.contextTypes.has(contextType);
  }

  /**
   * Get all supported context types
   */
  getSupportedContextTypes(): ContextTypeMetadata[] {
    return Array.from(this.contextTypes.values());
  }

  /**
   * Get metadata for a specific context type
   */
  getContextTypeMetadata(contextType: string): ContextTypeMetadata | undefined {
    return this.contextTypes.get(contextType);
  }

  /**
   * Create context instance with caching
   */
  async createContextInstance(
    contextType: string,
    services: ContextServices,
    args?: Record<string, any>,
  ): Promise<AnyContext> {
    const cacheKey = this.getCacheKey(contextType, args);

    // Check cache first
    if (this.config.cacheContextInstances && this.contextCache.has(cacheKey)) {
      this.logger.debug(`Using cached context instance: ${cacheKey}`);
      return this.contextCache.get(cacheKey);
    }

    // Create new instance
    const metadata = this.contextTypes.get(contextType);
    if (!metadata) {
      throw new Error(`Context type '${contextType}' is not supported`);
    }

    // Validate services
    const missingServices = metadata.requiredServices.filter(
      service => !services[service],
    );
    if (missingServices.length > 0) {
      throw new Error(
        `Missing required services: ${missingServices.join(', ')}`,
      );
    }

    const context = metadata.factory(services);

    // Cache the instance
    if (this.config.cacheContextInstances) {
      this.cacheContextInstance(cacheKey, context);
    }

    this.logger.log(`Created context instance: ${contextType}`);
    return context;
  }

  /**
   * Clear context cache
   */
  clearContextCache(contextType?: string): void {
    if (contextType) {
      // Clear cache for specific context type
      const keysToDelete = Array.from(this.contextCache.keys()).filter(key =>
        key.startsWith(`${contextType}:`),
      );
      keysToDelete.forEach(key => this.contextCache.delete(key));
      this.logger.log(`Cleared cache for context type: ${contextType}`);
    } else {
      // Clear all cache
      this.contextCache.clear();
      this.logger.log('Cleared all context cache');
    }
  }

  /**
   * Get context factory configuration
   */
  getConfig(): FactoryConfig {
    return { ...this.config };
  }

  /**
   * Update factory configuration
   */
  updateConfig(updates: Partial<FactoryConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Factory configuration updated');
  }

  /**
   * Get factory statistics
   */
  getStatistics(): {
    supportedContextTypes: number;
    cachedInstances: number;
    cacheHitRate: number;
    // capabilityStats: any;
  } {
    return {
      supportedContextTypes: this.contextTypes.size,
      cachedInstances: this.contextCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      // capabilityStats: this.capabilityRegistry.getCapabilityStats(),
    };
  }

  /**
   * Generate cache key for context instance
   */
  private getCacheKey(contextType: string, args?: Record<string, any>): string {
    const argsHash = args ? JSON.stringify(args) : '';
    return `${contextType}:${Buffer.from(argsHash).toString('base64').slice(0, 16)}`;
  }

  /**
   * Cache context instance with size limit
   */
  private cacheContextInstance(key: string, context: AnyContext): void {
    // Enforce cache size limit
    if (this.contextCache.size >= this.config.maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.contextCache.keys().next().value;
      if (firstKey) {
        this.contextCache.delete(firstKey);
      }
    }

    this.contextCache.set(key, context);
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateCacheHitRate(): number {
    // This would need to be implemented with proper hit/miss tracking
    return this.contextCache.size > 0 ? 0.8 : 0; // Placeholder
  }

  /**
   * Discover available services from the provided services object
   */
  discoverServices(services: ContextServices): {
    available: string[];
    missing: string[];
    recommendations: Record<string, string>;
  } {
    const available: string[] = [];
    const missing: string[] = [];
    const recommendations: Record<string, string> = {};

    const commonServices = [
      'mcpService',
      'chromaService',
      'memoryService',
      'storageService',
      'modelService',
      'configService',
    ];

    for (const service of commonServices) {
      if (services[service]) {
        available.push(service);
      } else {
        missing.push(service);
        recommendations[service] = this.getServiceRecommendation(service);
      }
    }

    return { available, missing, recommendations };
  }

  /**
   * Get recommendation for missing service
   */
  private getServiceRecommendation(serviceName: string): string {
    const recommendations = {
      mcpService: 'Required for Linear, Notion, and other MCP integrations',
      chromaService: 'Required for knowledge base and document search',
      memoryService: 'Required for conversation memory and state persistence',
      storageService: 'Required for agent configuration persistence',
      modelService: 'Required for LLM model initialization',
      configService: 'Required for configuration management',
    };

    return (
      recommendations[serviceName] ||
      'Service provides additional functionality'
    );
  }
}
