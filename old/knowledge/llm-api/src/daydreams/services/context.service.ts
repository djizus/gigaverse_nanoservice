import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chatContext } from '../context/chat.context';
import { AnyContext } from '@daydreamsai/core';
import { TemplateService } from '../template.service';
import { McpService } from './mcp.service';
import { ContextFactoryService } from './context-factory.service';
import { ContextServices } from '../types/context-factory';
// import * as fs from "fs/promises"; // Disabled for Railway
// import * as path from "path"; // Disabled for Railway
import { randomUUID } from 'crypto';
import { ContextTemplate } from '../types/context';

export interface ContextDescription {
  name: string;
  description: string;
  defaultArgs?: Record<string, unknown>;
}

@Injectable()
export class ContextService {
  private availableContexts: Map<string, AnyContext> = new Map();
  private contextDescriptions: Map<string, ContextDescription> = new Map();
  private contextTemplates: Map<string, ContextTemplate> = new Map();

  constructor(
    private readonly templateService: TemplateService,
    private readonly mcpService: McpService,
    private readonly contextFactory: ContextFactoryService,
    private configService: ConfigService,
  ) {
    // Initialize contexts asynchronously
    this.initializeContexts().catch(error => {
      console.error('[ERROR] Failed to initialize contexts:', error);
    });
  }

  private async initializeContexts() {
    // Register default chat context
    this.availableContexts.set('chat', chatContext);

    // Register chat context description
    this.contextDescriptions.set('chat', {
      name: 'Chat',
      description: 'Basic chat conversation context with message history',
      defaultArgs: {
        sessionId: randomUUID(),
        userId: 'user',
      },
    });

    // Linear context removed - can be re-added later if needed

    // Register default templates
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates() {
    // Basic chat template
    const basicChatTemplate: ContextTemplate = {
      id: 'basic-chat',
      name: 'Basic Chat',
      description: 'A simple chat template',
      content: `You are a helpful AI assistant. Your goal is to help the user with their questions and tasks.

Current conversation:
{{conversation}}

User: {{message}}
Assistant:`,
      variables: [
        { name: 'conversation', description: 'Chat history', defaultValue: '' },
        { name: 'message', description: 'User message', defaultValue: '' },
      ],
      context: chatContext,
      defaultArgs: {
        sessionId: randomUUID(),
        userId: 'user',
      },
    };
    this.contextTemplates.set(basicChatTemplate.id, basicChatTemplate);

    // Tech support template
    const techSupportTemplate: ContextTemplate = {
      id: 'tech-support',
      name: 'Tech Support',
      description: 'Technical support assistant template',
      content: `You are a technical support specialist. Help users solve their technical problems.

Current conversation:
{{conversation}}

User: {{message}}
Assistant:`,
      variables: [
        {
          name: 'conversation',
          description: 'Support history',
          defaultValue: '',
        },
        { name: 'message', description: 'User issue', defaultValue: '' },
      ],
      context: chatContext,
      defaultArgs: {
        sessionId: randomUUID(),
        userId: 'user',
      },
    };
    this.contextTemplates.set(techSupportTemplate.id, techSupportTemplate);

    // Creative assistant template
    const creativeTemplate: ContextTemplate = {
      id: 'creative-assistant',
      name: 'Creative Assistant',
      description: 'Creative writing and brainstorming assistant',
      content: `You are a creative assistant. Help users with writing, brainstorming, and creative tasks.

Current conversation:
{{conversation}}

User: {{message}}
Assistant:`,
      variables: [
        {
          name: 'conversation',
          description: 'Creative session history',
          defaultValue: '',
        },
        { name: 'message', description: 'User input', defaultValue: '' },
      ],
      context: chatContext,
      defaultArgs: {
        sessionId: randomUUID(),
        userId: 'user',
      },
    };
    this.contextTemplates.set(creativeTemplate.id, creativeTemplate);
  }

  registerContext(
    id: string,
    context: AnyContext,
    description: ContextDescription,
  ) {
    this.availableContexts.set(id, context);
    this.contextDescriptions.set(id, description);
    console.log(`[INFO] Context registered: ${id}`);
  }

  contextExists(id: string): boolean {
    return this.availableContexts.has(id);
  }

  getContext(id: string): AnyContext | null {
    return this.availableContexts.get(id) || null;
  }

  getAvailableContexts(): string[] {
    return Array.from(this.availableContexts.keys());
  }

  getContextDetails(id: string): ContextDescription | null {
    return this.contextDescriptions.get(id) || null;
  }

  async createContext(
    id: string,
    name: string,
    description: string,
    defaultArgs: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (this.contextExists(id)) {
      throw new Error(`Context with ID ${id} already exists`);
    }

    // Pour créer un nouveau contexte, nous allons l'enregistrer dans la map
    // et pour une persistance potentielle, on pourrait sauvegarder ces données
    this.contextDescriptions.set(id, {
      name,
      description,
      defaultArgs,
    });

    // Nous ne pouvons pas dynamiquement créer un AnyContext sans code,
    // alors nous utilisons un contexte générique basé sur le chat
    this.availableContexts.set(id, chatContext);

    // Pour une implémentation réelle, nous pourrions sauvegarder cette information
    try {
      // Simuler la sauvegarde du contexte
      await this.saveContextMetadata();
      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to create context ${id}:`, error);
      // Si la sauvegarde échoue, on supprime le contexte de la map
      this.contextDescriptions.delete(id);
      this.availableContexts.delete(id);
      return false;
    }
  }

  async updateContext(
    id: string,
    name?: string,
    description?: string,
    defaultArgs?: Record<string, unknown>,
  ): Promise<boolean> {
    const existingDescription = this.contextDescriptions.get(id);

    if (!existingDescription) {
      return false;
    }

    const updatedDescription = {
      ...existingDescription,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(defaultArgs !== undefined ? { defaultArgs } : {}),
    };

    this.contextDescriptions.set(id, updatedDescription);

    try {
      // Simuler la sauvegarde du contexte mis à jour
      await this.saveContextMetadata();
      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to update context ${id}:`, error);
      // En cas d'échec, on restaure l'ancienne description
      this.contextDescriptions.set(id, existingDescription);
      return false;
    }
  }

  async deleteContext(id: string): Promise<boolean> {
    if (!this.contextExists(id)) {
      return false;
    }

    const isDeleted =
      this.availableContexts.delete(id) && this.contextDescriptions.delete(id);

    if (isDeleted) {
      try {
        // Simuler la sauvegarde après suppression
        await this.saveContextMetadata();
        return true;
      } catch (error) {
        console.error(
          `[ERROR] Failed to persist context deletion ${id}:`,
          error,
        );
        return false;
      }
    }

    return false;
  }

  createContextTemplate(template: ContextTemplate): string {
    this.contextTemplates.set(template.id, template);
    return template.id;
  }

  getAllContextTemplates(): ContextTemplate[] {
    return Array.from(this.contextTemplates.values());
  }

  getContextTemplate(id: string): ContextTemplate | null {
    return this.contextTemplates.get(id) || null;
  }

  private async saveContextMetadata(): Promise<void> {
    // Cette méthode simule la persistance des métadonnées de contexte
    // Dans une implémentation réelle, nous pourrions sauvegarder dans une base de données
    // ou dans des fichiers de configuration
    console.log('[INFO] Context metadata would be saved here');

    // Exemple de sauvegarde fictive
    const metadata = {
      contexts: Array.from(this.contextDescriptions.entries()).map(
        ([id, desc]) => ({
          id,
          ...desc,
        }),
      ),
    };

    // Disabled for Railway deployment - no filesystem access
    // const dataDirectory = path.join(process.cwd(), "data");
    // try {
    //   await fs.mkdir(dataDirectory, { recursive: true });
    //   // Ceci est une simulation - dans une vraie implémentation, nous sauvegarderions réellement
    //   // await fs.writeFile(
    //   //   path.join(dataDirectory, "contexts.json"),
    //   //   JSON.stringify(metadata, null, 2)
    //   // );
    // } catch (error) {
    //   console.error("[ERROR] Failed to save context metadata:", error);
    //   throw error;
    // }
  }

  /**
   * Create context using factory pattern
   */
  async createContextFromFactory(
    contextType: string,
    args?: Record<string, any>,
  ): Promise<AnyContext> {
    const services = this.getContextServices();
    return this.contextFactory.createContextInstance(
      contextType,
      services,
      args,
    );
  }

  /**
   * Get available capabilities for a context type
   */
  getContextCapabilities(contextType: string): string[] {
    const services = this.getContextServices();
    return this.contextFactory.getAvailableCapabilities(contextType, services);
  }

  /**
   * Validate context requirements
   */
  validateContextRequirements(contextType: string): {
    isSupported: boolean;
    missingServices: string[];
    availableCapabilities: string[];
  } {
    const services = this.getContextServices();
    const metadata = this.contextFactory.getContextTypeMetadata(contextType);

    if (!metadata) {
      return {
        isSupported: false,
        missingServices: [],
        availableCapabilities: [],
      };
    }

    const missingServices = metadata.requiredServices.filter(
      service => !services[service],
    );

    const availableCapabilities = this.contextFactory.getAvailableCapabilities(
      contextType,
      services,
    );

    return {
      isSupported: missingServices.length === 0,
      missingServices,
      availableCapabilities,
    };
  }

  /**
   * Get all supported context types from factory
   */
  getSupportedContextTypes(): Array<{
    type: string;
    name: string;
    description: string;
    capabilities: string[];
    isAvailable: boolean;
  }> {
    const supportedTypes = this.contextFactory.getSupportedContextTypes();
    const services = this.getContextServices();

    return supportedTypes.map(metadata => {
      const validation = this.validateContextRequirements(metadata.type);
      return {
        type: metadata.type,
        name: metadata.name,
        description: metadata.description,
        capabilities: this.contextFactory.getAvailableCapabilities(
          metadata.type,
          services,
        ),
        isAvailable: validation.isSupported,
      };
    });
  }

  /**
   * Suggest optimal contexts based on requested capabilities
   */
  suggestContextsForCapabilities(requestedCapabilities: string[]): Array<{
    contextType: string;
    matchedCapabilities: string[];
    score: number;
  }> {
    const supportedTypes = this.contextFactory.getSupportedContextTypes();
    const services = this.getContextServices();
    const suggestions: Array<{
      contextType: string;
      matchedCapabilities: string[];
      score: number;
    }> = [];

    for (const metadata of supportedTypes) {
      const availableCapabilities =
        this.contextFactory.getAvailableCapabilities(metadata.type, services);

      const matchedCapabilities = requestedCapabilities.filter(cap =>
        availableCapabilities.includes(cap),
      );

      if (matchedCapabilities.length > 0) {
        const score = matchedCapabilities.length / requestedCapabilities.length;
        suggestions.push({
          contextType: metadata.type,
          matchedCapabilities,
          score,
        });
      }
    }

    // Sort by score (highest first)
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Get context services for factory
   */
  private getContextServices(): ContextServices {
    return {
      mcpService: this.mcpService,
      contextService: this,
      configService: this.configService,
      templateService: this.templateService,
    };
  }

  /**
   * Get factory statistics
   */
  getFactoryStatistics() {
    return this.contextFactory.getStatistics();
  }

  /**
   * Clear context cache
   */
  clearContextCache(contextType?: string): void {
    this.contextFactory.clearContextCache(contextType);
  }
}
