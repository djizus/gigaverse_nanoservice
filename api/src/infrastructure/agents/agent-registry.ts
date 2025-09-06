import { randomUUID } from 'crypto';
import { createDreamsRouter, createDreamsRouterAuth } from '@daydreamsai/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import {
  SimpleAgentConfig,
  DreamsConfig,
  AgentMessage,
  AgentSession,
  SendMessageOptions,
  StreamResponse
} from '../../shared/types/agent.types';
import { validateDreamsConfig } from '../config/dreams.config';
import { DreamsRuntimeService } from './dreams-runtime.service';

export interface DreamsProvider {
  model: (modelId: string) => any;
  isAuthenticated: boolean;
  method: 'apikey' | 'payment';
}

export class AgentRegistry {
  private agents: Map<string, SimpleAgentConfig> = new Map();
  private providers: Map<string, DreamsProvider> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private dreamsRuntime: DreamsRuntimeService;
  
  constructor() {
    this.dreamsRuntime = new DreamsRuntimeService();
  }
  
  async createAgent(config: Omit<SimpleAgentConfig, 'id'>): Promise<string> {
    const agentId = `agent-${randomUUID()}`;
    
    const agentConfig: SimpleAgentConfig = {
      id: agentId,
      status: 'active',
      ...config,
    };
    
    // Validate Dreams configuration
    const validation = validateDreamsConfig(config.dreams);
    if (!validation.valid) {
      throw new Error(`Invalid Dreams config: ${validation.errors.join(', ')}`);
    }
    
    // Store agent config
    this.agents.set(agentId, agentConfig);
    
    try {
      // Use proper Dreams runtime with x402 or API key
      let actualAgentId: string;
      
      if (config.dreams.payment && !config.dreams.apiKey) {
        // Use x402 payment method (the preferred way)
        console.log(`[AgentRegistry] Creating agent with x402 payments: ${agentConfig.name}`);
        actualAgentId = await this.dreamsRuntime.createAgentWithPayments(agentConfig);
        
        // Mark as payment method
        this.providers.set(agentId, {
          model: () => null, // Not used in runtime mode
          isAuthenticated: true,
          method: 'payment'
        });
        
      } else if (config.dreams.apiKey) {
        // Use API key method (fallback)
        console.log(`[AgentRegistry] Creating agent with API key: ${agentConfig.name}`);
        actualAgentId = await this.dreamsRuntime.createAgentWithAPIKey(agentConfig);
        
        // Mark as API key method
        this.providers.set(agentId, {
          model: () => null, // Not used in runtime mode
          isAuthenticated: true,
          method: 'apikey'
        });
        
      } else {
        throw new Error('Either API key or payment configuration required');
      }
      
      console.log(`[AgentRegistry] Created agent ${agentId} using Dreams runtime`);
      
      return agentId;
    } catch (error: any) {
      // Cleanup on failure
      this.agents.delete(agentId);
      console.error(`[AgentRegistry] Failed to create agent ${agentId}:`, error);
      throw error;
    }
  }
  
  private async initializeProvider(agentId: string, config: DreamsConfig): Promise<void> {
    let provider: DreamsProvider;
    
    if (config.apiKey) {
      // Method 1: API Key authentication
      try {
        const dreamsRouter = createDreamsRouter({ apiKey: config.apiKey });
        provider = {
          model: (modelId: string) => dreamsRouter(modelId),
          isAuthenticated: true,
          method: 'apikey'
        };
        console.log(`[AgentRegistry] Initialized Dreams router with API key for agent ${agentId}`);
      } catch (error) {
        console.error(`[AgentRegistry] Failed to initialize API key method:`, error);
        throw new Error('Failed to initialize Dreams router with API key');
      }
    } else if (config.payment) {
      // Method 2: x402 Micropayment authentication
      try {
        // TODO: Implement wallet setup
        // For now, throw an error to indicate payment method needs implementation
        throw new Error('x402 payment method not yet implemented - please use API key method');
        
        // Future implementation:
        // const account = await setupWalletAccount(config.payment);
        // const { dreamsRouter } = await createDreamsRouterAuth(account, {
        //   payments: {
        //     amount: config.payment.amount,
        //     network: config.payment.network,
        //   },
        // });
        // provider = {
        //   model: (modelId: string) => dreamsRouter(modelId),
        //   isAuthenticated: true,
        //   method: 'payment'
        // };
      } catch (error) {
        console.error(`[AgentRegistry] Failed to initialize payment method:`, error);
        throw error;
      }
    } else {
      throw new Error('No authentication method available (neither API key nor payment config provided)');
    }
    
    this.providers.set(agentId, provider);
  }
  
  async getAgent(agentId: string): Promise<SimpleAgentConfig | null> {
    return this.agents.get(agentId) || null;
  }
  
  async deleteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Cleanup
    this.agents.delete(agentId);
    this.providers.delete(agentId);
    
    // Delete associated sessions
    const agentSessions = Array.from(this.sessions.values())
      .filter(session => session.agentId === agentId);
    
    for (const session of agentSessions) {
      this.sessions.delete(session.id);
    }
    
    console.log(`[AgentRegistry] Deleted agent ${agentId} and ${agentSessions.length} sessions`);
    return true;
  }
  
  listAgents(): SimpleAgentConfig[] {
    return Array.from(this.agents.values());
  }
  
  async sendMessage(
    agentId: string, 
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<{ response: string; sessionId: string }> {
    const agent = this.agents.get(agentId);
    const provider = this.providers.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (!provider || !provider.isAuthenticated) {
      throw new Error(`Agent ${agentId} provider not authenticated`);
    }
    
    // Get or create session
    const sessionId = options.sessionId || this.createSession(agentId);
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Add user message to session
      const userMessage: AgentMessage = {
        id: `msg-${randomUUID()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        sessionId,
        agentId,
      };
      session.messages.push(userMessage);
      
      console.log(`[AgentRegistry] Sending message to Dreams runtime agent ${agentId}`);
      
      // Use Dreams runtime for message processing
      const result = await this.dreamsRuntime.sendMessage(agentId, message, {
        sessionId,
        context: options.context,
        temperature: options.temperature,
      });
      
      // Add assistant message to session
      const assistantMessage: AgentMessage = {
        id: `msg-${randomUUID()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        sessionId,
        agentId,
      };
      session.messages.push(assistantMessage);
      
      // Update session
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
      
      console.log(`[AgentRegistry] Dreams runtime response received for agent ${agentId}`);
      
      return { response: result.response, sessionId };
      
    } catch (error: any) {
      console.error(`[AgentRegistry] Failed to send message for agent ${agentId}:`, error);
      
      // Handle specific error types
      if (error?.statusCode === 402 || error?.code === 'PaymentRequired') {
        throw new Error('Payment required - please check your Dreams Router configuration');
      }
      
      throw new Error(`Failed to generate response: ${error?.message || error}`);
    }
  }
  
  async streamMessage(
    agentId: string,
    message: string,
    options: SendMessageOptions = {}
  ): Promise<AsyncIterable<StreamResponse>> {
    const agent = this.agents.get(agentId);
    const provider = this.providers.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (!provider || !provider.isAuthenticated) {
      throw new Error(`Agent ${agentId} provider not authenticated`);
    }
    
    // Get or create session
    const sessionId = options.sessionId || this.createSession(agentId);
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const self = this;
    
    return {
      async *[Symbol.asyncIterator]() {
        try {
          // Add user message to session
          const userMessage: AgentMessage = {
            id: `msg-${randomUUID()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            sessionId,
            agentId,
          };
          session.messages.push(userMessage);
          
          console.log(`[AgentRegistry] Streaming message to Dreams runtime agent ${agentId}`);
          
          // Use Dreams runtime for streaming
          const stream = await self.dreamsRuntime.streamMessage(agentId, message, {
            sessionId,
            context: options.context,
            temperature: options.temperature,
          });
          
          let fullResponse = '';
          
          for await (const delta of stream) {
            fullResponse += delta;
            yield { type: 'chunk', data: delta } as StreamResponse;
          }
          
          // Add assistant message to session
          const assistantMessage: AgentMessage = {
            id: `msg-${randomUUID()}`,
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
            sessionId,
            agentId,
          };
          session.messages.push(assistantMessage);
          
          // Update session
          session.updatedAt = new Date().toISOString();
          self.sessions.set(sessionId, session);
          
          console.log(`[AgentRegistry] Dreams runtime stream completed for agent ${agentId}`);
          
          yield { type: 'done', data: 'Stream completed' } as StreamResponse;
          
        } catch (error: any) {
          console.error(`[AgentRegistry] Stream error for agent ${agentId}:`, error);
          
          if (error?.statusCode === 402 || error?.code === 'PaymentRequired') {
            yield { 
              type: 'error', 
              data: { error: 'Payment required - please check your Dreams Router configuration', code: '402' }
            } as StreamResponse;
          } else {
            yield { 
              type: 'error', 
              data: { error: error?.message || 'Stream failed' }
            } as StreamResponse;
          }
        }
      }
    };
  }
  
  createSession(agentId: string): string {
    const sessionId = `session-${randomUUID()}`;
    
    const session: AgentSession = {
      id: sessionId,
      agentId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }
  
  getSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) || null;
  }
  
  listSessions(agentId?: string): AgentSession[] {
    const sessions = Array.from(this.sessions.values());
    return agentId 
      ? sessions.filter(session => session.agentId === agentId)
      : sessions;
  }
  
  getProviderStatus(agentId: string): { authenticated: boolean; method?: string; error?: string } {
    const provider = this.providers.get(agentId);
    
    if (!provider) {
      return { authenticated: false, error: 'Provider not initialized' };
    }
    
    return {
      authenticated: provider.isAuthenticated,
      method: provider.method,
    };
  }
}