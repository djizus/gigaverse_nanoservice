/**
 * Hybrid Agent Adapter
 * 
 * This adapter allows the existing AgentService to use either:
 * 1. The old complex system (Daydreams Core + Supabase)
 * 2. The new simplified AgentRegistry
 * 
 * This provides backward compatibility while enabling the new architecture.
 */

import { AgentRegistry } from '../../infrastructure/agents/agent-registry';
import { defaultDreamsConfig } from '../../infrastructure/config/dreams.config';
import type { AgentConfig } from '../types/agent';

export interface HybridAgentAdapterOptions {
  agentRegistry: AgentRegistry;
  useNewSystem?: boolean; // Toggle between old/new system
}

export class HybridAgentAdapter {
  constructor(private options: HybridAgentAdapterOptions) {}
  
  /**
   * Create agent using the new simplified system
   */
  async createAgentWithRegistry(input: {
    name: string;
    model?: string;
    context?: string;
    instructions?: string;
    description?: string;
    routerApiKey?: string;
  }): Promise<{ id: string; name: string; model: string; context: string; instructions?: string; status: string }> {
    
    // Use provided API key or fallback to default
    const dreams = {
      ...defaultDreamsConfig,
      apiKey: input.routerApiKey || defaultDreamsConfig.apiKey,
    };
    
    const agentId = await this.options.agentRegistry.createAgent({
      name: input.name,
      model: input.model || 'google-vertex/gemini-2.5-flash',
      context: input.context || 'chat',
      instructions: input.instructions || `You are ${input.name}, a helpful assistant.`,
      dreams,
    });
    
    const agent = await this.options.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error('Failed to retrieve created agent');
    }
    
    // Return in the format expected by existing code
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      context: agent.context || 'chat',
      instructions: agent.instructions,
      status: agent.status || 'active',
    };
  }
  
  /**
   * Send message using the new simplified system
   */
  async sendMessageWithRegistry(
    agentId: string,
    message: string,
    options: {
      sessionId?: string;
      context?: any;
      args?: any;
    } = {}
  ): Promise<{ reply: { content: string }; sessionId: string }> {
    
    const result = await this.options.agentRegistry.sendMessage(agentId, message, {
      sessionId: options.sessionId,
      context: options.context,
      args: options.args,
    });
    
    // Return in format expected by existing code
    return {
      reply: { content: result.response },
      sessionId: result.sessionId,
    };
  }
  
  /**
   * Stream message using the new simplified system
   */
  async streamMessageWithRegistry(
    agentId: string,
    message: string,
    options: {
      sessionId?: string;
      context?: any;
      args?: any;
    } = {}
  ): Promise<AsyncIterable<string>> {
    
    const stream = await this.options.agentRegistry.streamMessage(agentId, message, {
      sessionId: options.sessionId,
      context: options.context,
      args: options.args,
    });
    
    // Transform to simple string stream
    async function* transformStream() {
      for await (const chunk of stream) {
        if (chunk.type === 'chunk') {
          yield chunk.data as string;
        } else if (chunk.type === 'error') {
          throw new Error(typeof chunk.data === 'string' ? chunk.data : (chunk.data as any).error);
        }
        // Ignore 'done' type
      }
    }
    
    return transformStream();
  }
  
  /**
   * Check if agent exists in the new system
   */
  async hasAgentInRegistry(agentId: string): Promise<boolean> {
    const agent = await this.options.agentRegistry.getAgent(agentId);
    return !!agent;
  }
  
  /**
   * Get agent from the new system
   */
  async getAgentFromRegistry(agentId: string): Promise<AgentConfig | null> {
    const agent = await this.options.agentRegistry.getAgent(agentId);
    if (!agent) return null;
    
    // Transform to expected format
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      context: agent.context || 'chat',
      instructions: agent.instructions,
      status: agent.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AgentConfig;
  }
  
  /**
   * List agents from the new system
   */
  async listAgentsFromRegistry(): Promise<AgentConfig[]> {
    const agents = this.options.agentRegistry.listAgents();
    
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      context: agent.context || 'chat',
      instructions: agent.instructions,
      status: agent.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AgentConfig));
  }
  
  /**
   * Delete agent from the new system
   */
  async deleteAgentFromRegistry(agentId: string): Promise<boolean> {
    return await this.options.agentRegistry.deleteAgent(agentId);
  }
  
  /**
   * Get provider status for debugging
   */
  getProviderStatus(agentId: string) {
    return this.options.agentRegistry.getProviderStatus(agentId);
  }
}