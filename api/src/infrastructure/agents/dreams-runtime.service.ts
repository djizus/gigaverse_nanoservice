/**
 * Dreams Runtime Service - True Daydreams implementation
 * 
 * Implements the official Daydreams pattern with createDreamsRouterAuth
 */

import { 
  createDreams, 
  context,
  action,
  LogLevel
} from '@daydreamsai/core';
import { createDreamsRouterAuth, createDreamsRouter } from '@daydreamsai/ai-sdk-provider';
import { z } from 'zod';
import { X402WalletService, type WalletAccount } from '../payments/x402-wallet.service';
import type { SimpleAgentConfig, DreamsConfig } from '../../shared/types/agent.types';

// Helper for schema compatibility
function createSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape) as any;
}

// Chat context memory interface
interface ChatMemory {
  messageHistory: {
    sender: 'user' | 'agent';
    text: string;
    timestamp: number;
  }[];
  lastInteractionTime: number;
  title: string;
  isActive: boolean;
  messageCount: number;
}

// Chat context schema for message validation
const chatSchema = createSchema({
  sessionId: z.string().describe('Unique identifier for the chat session'),
  userId: z.string().describe('Identifier for the user in the session'),
  agentInstructions: z.string().optional().describe('Custom instructions for this agent'),
  agentName: z.string().optional().describe('Name of the agent'),
});

// Simplifié pour l'API moderne - pas besoin d'inputs/outputs séparés

// Basic chat action
const addToChatHistoryAction = action({
  name: 'addToChatHistory',
  description: 'Add a new message to the chat history',
  schema: createSchema({
    sender: z.enum(['user', 'agent']).describe('Who sent the message'),
    text: z.string().describe('The message content'),
    timestamp: z.number().optional().describe('Optional timestamp (defaults to now)'),
  }),
  handler(args, ctx, agent) {
    console.log('[DreamsRuntime] addToChatHistoryAction called', { args });
    
    // Handle the case where args or ctx might be undefined
    if (!args || !ctx) {
      console.log('[DreamsRuntime] Missing args or context - framework-managed call');
      return;
    }

    // Add to memory if available
    if (ctx.memory && ctx.memory.messageHistory) {
      ctx.memory.messageHistory.push({
        sender: args.sender,
        text: args.text,
        timestamp: args.timestamp || Date.now(),
      });
      ctx.memory.messageCount = (ctx.memory.messageCount || 0) + 1;
      ctx.memory.lastInteractionTime = Date.now();
    }
  },
});

// Chat actions array
const chatActions = [addToChatHistoryAction];

export class DreamsRuntimeService {
  private walletService: X402WalletService;
  private agents: Map<string, any> = new Map(); // Store Dreams instances
  private agentConfigs: Map<string, SimpleAgentConfig> = new Map();
  private agentContexts: Map<string, any> = new Map(); // Store contexts per agent
  
  constructor() {
    this.walletService = new X402WalletService();
    console.log('[DreamsRuntime] Service initialized');
  }
  
  /**
   * Create assistant context following modern Daydreams patterns (v0.3.18)
   */
  private createAssistantContext() {
    return context({
      type: 'chat',
      schema: chatSchema,
      create: () => ({
        messages: [],
        isActive: true,
      }),
      // Remove custom actions for now to test basic functionality
    });
  }
  
  /**
   * Create Dreams agent with payment authentication
   */
  async createAgentWithPayments(config: SimpleAgentConfig): Promise<string> {
    console.log(`[DreamsRuntime] Creating agent with x402 payments: ${config.name}`);
    
    try {
      // Get or create wallet account
      const account = await this.walletService.getOrCreateWallet();
      
      // Validate wallet
      const isValidWallet = await this.walletService.validateWallet(account);
      if (!isValidWallet) {
        throw new Error('Invalid wallet configuration for x402 payments');
      }
      
      // Setup payment configuration
      const paymentConfig = this.walletService.getPaymentConfig(
        config.dreams.payment?.amount || '100000'
      );
      
      console.log(`[DreamsRuntime] Setting up payments:`, {
        amount: paymentConfig.amount,
        network: paymentConfig.network,
        wallet: account.address,
      });
      
      // Create Dreams Router with payment authentication
      const { dreamsRouter } = await createDreamsRouterAuth(account as any, {
        payments: {
          amount: paymentConfig.amount,
          network: paymentConfig.network,
        },
      });
      
      console.log(`[DreamsRuntime] Dreams Router authenticated successfully`);
      
      // Create assistant context
      const assistantContext = this.createAssistantContext();
      
      // Create Dreams agent (modern API)
      const dreams = createDreams({
        model: dreamsRouter(config.dreams.model),
        contexts: [assistantContext],
      });
      
      // Start the Dreams agent with detailed logging
      console.log(`[DreamsRuntime] Starting Dreams agent ${config.id}...`);
      try {
        await dreams.start();
        console.log(`[DreamsRuntime] Dreams agent ${config.id} started successfully`);
      } catch (error) {
        console.error(`[DreamsRuntime] Failed to start Dreams agent ${config.id}:`, error);
        throw error;
      }
      
      // Store the booted dreams instance and its context
      this.agents.set(config.id, dreams);
      this.agentConfigs.set(config.id, config);
      this.agentContexts.set(config.id, assistantContext);
      
      console.log(`[DreamsRuntime] Agent ${config.id} stored successfully`);
      
      console.log(`[DreamsRuntime] Agent created successfully: ${config.id}`);
      console.log(`[DreamsRuntime] Payment model: ${paymentConfig.amount} USDC per request`);
      
      return config.id;
      
    } catch (error: any) {
      console.error(`[DreamsRuntime] Failed to create agent with payments:`, error);
      throw new Error(`Failed to create Dreams agent: ${error?.message}`);
    }
  }
  
  /**
   * Create Dreams agent with API key fallback
   */
  async createAgentWithAPIKey(config: SimpleAgentConfig): Promise<string> {
    console.log(`[DreamsRuntime] Creating agent with API key: ${config.name}`);
    
    if (!config.dreams.apiKey) {
      throw new Error('API key required for Dreams Router');
    }
    
    try {
      // Create Dreams Router with API key
      const dreamsRouter = createDreamsRouter({ 
        apiKey: config.dreams.apiKey 
      });
      
      console.log(`[DreamsRuntime] Dreams Router initialized with API key`);
      
      // Create assistant context
      const assistantContext = this.createAssistantContext();
      
      // Create Dreams agent (modern API)
      const dreams = createDreams({
        model: dreamsRouter(config.dreams.model),
        contexts: [assistantContext],
      });
      
      // Start the Dreams agent with detailed logging
      console.log(`[DreamsRuntime] Starting Dreams agent ${config.id}...`);
      try {
        await dreams.start();
        console.log(`[DreamsRuntime] Dreams agent ${config.id} started successfully`);
      } catch (error) {
        console.error(`[DreamsRuntime] Failed to start Dreams agent ${config.id}:`, error);
        throw error;
      }
      
      // Store the booted dreams instance and its context
      this.agents.set(config.id, dreams);
      this.agentConfigs.set(config.id, config);
      this.agentContexts.set(config.id, assistantContext);
      
      console.log(`[DreamsRuntime] Agent ${config.id} stored successfully`);
      
      console.log(`[DreamsRuntime] Agent created successfully with API key: ${config.id}`);
      
      return config.id;
      
    } catch (error: any) {
      console.error(`[DreamsRuntime] Failed to create agent with API key:`, error);
      throw new Error(`Failed to create Dreams agent: ${error?.message}`);
    }
  }
  
  /**
   * Send message to Dreams agent
   */
  async sendMessage(
    agentId: string,
    message: string,
    options: {
      sessionId?: string;
      context?: any;
      temperature?: number;
    } = {}
  ): Promise<{ response: string; sessionId: string }> {
    const agent = this.agents.get(agentId);
    const config = this.agentConfigs.get(agentId);
    const context = this.agentContexts.get(agentId);
    
    if (!agent || !config || !context) {
      throw new Error(`Agent ${agentId} not found or not properly initialized`);
    }
    
    const sessionId = options.sessionId || `session-${Date.now()}`;
    
    console.log(`[DreamsRuntime] Sending message to agent ${agentId}, session ${sessionId}`);
    
    try {
      // Modern Dreams API - use run() with stored context and args
      const response = await agent.run({
        context: context,
        args: {
          sessionId,
          userId: 'default',
          agentInstructions: config.instructions,
          agentName: config.name,
        },
        input: message,
      });
      
      console.log(`[DreamsRuntime] Response generated for agent ${agentId}`);
      console.log(`[DreamsRuntime] Raw response:`, JSON.stringify(response, null, 2));
      console.log(`[DreamsRuntime] Response keys:`, response && typeof response === 'object' ? Object.keys(response) : 'N/A');
      
      // If response is an object, log all its properties 
      if (response && typeof response === 'object') {
        console.log(`[DreamsRuntime] Response properties:`);
        for (const [key, value] of Object.entries(response)) {
          console.log(`  ${key}:`, typeof value, value?.constructor?.name || typeof value);
        }
        
        // Also check prototype methods and getters
        console.log(`[DreamsRuntime] Response prototype methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(response)));
        
        // Try to see if there are specific Dreams methods
        if (typeof response.getText === 'function') {
          console.log(`[DreamsRuntime] Found getText method, trying...`);
          try {
            const text = await response.getText();
            console.log(`[DreamsRuntime] getText() result:`, text);
          } catch (e) {
            console.log(`[DreamsRuntime] getText() failed:`, e.message);
          }
        }
        
        if (typeof response.getContent === 'function') {
          console.log(`[DreamsRuntime] Found getContent method, trying...`);
          try {
            const content = await response.getContent();
            console.log(`[DreamsRuntime] getContent() result:`, content);
          } catch (e) {
            console.log(`[DreamsRuntime] getContent() failed:`, e.message);
          }
        }
      }
      
      // Extract response content - try multiple possible structures
      let responseContent = 'No response content';
      
      console.log(`[DreamsRuntime] Response type: ${typeof response}`);
      
      // First check if response is a string
      if (typeof response === 'string') {
        responseContent = response;
      } 
      // Check if it's an object with direct text property
      else if (response && typeof response === 'object') {
        // Try different possible response structures
        if (response.text) {
          responseContent = response.text;
        } else if (response.content) {
          responseContent = response.content;
        } else if (response.message) {
          responseContent = response.message;
        } else if (response.response) {
          responseContent = response.response;
        } else if (response.output) {
          responseContent = response.output;
        } else if (response.result) {
          responseContent = response.result;
        }
        // If it's an object with nested properties, check deeper
        else if (response.choices && response.choices[0]) {
          const choice = response.choices[0];
          if (choice.message && choice.message.content) {
            responseContent = choice.message.content;
          } else if (choice.text) {
            responseContent = choice.text;
          }
        }
        // Check if it's a Dreams-specific structure
        else if (response.logs && Array.isArray(response.logs)) {
          const outputLog = response.logs.find(log => log.type === 'output' || log.ref === 'output');
          if (outputLog && outputLog.content) {
            responseContent = outputLog.content;
          }
        }
      }
      // Then check if it's an array
      else if (Array.isArray(response) && response.length > 0) {
        console.log(`[DreamsRuntime] Response is array with ${response.length} items`);
        const outputResponse = response.find(item => item.ref === 'output');
        if (outputResponse && outputResponse.content) {
          responseContent = outputResponse.content;
        } else {
          // Fallback: find first response with content
          for (const item of response) {
            if (item && typeof item === 'object') {
              if (item.content) {
                responseContent = item.content;
                break;
              } else if (item.text) {
                responseContent = item.text;
                break;
              } else if (item.message) {
                responseContent = item.message;
                break;
              }
            }
          }
        }
      }
      
      console.log(`[DreamsRuntime] Extracted response content:`, responseContent);
      
      return {
        response: responseContent,
        sessionId,
      };
      
    } catch (error: any) {
      console.error(`[DreamsRuntime] Error sending message to agent ${agentId}:`, error);
      throw new Error(`Failed to send message: ${error?.message}`);
    }
  }
  
  /**
   * Stream message to Dreams agent
   */
  async streamMessage(
    agentId: string,
    message: string,
    options: {
      sessionId?: string;
      context?: any;
      temperature?: number;
    } = {}
  ): Promise<AsyncIterable<string>> {
    const agent = this.agents.get(agentId);
    const config = this.agentConfigs.get(agentId);
    
    if (!agent || !config) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    const sessionId = options.sessionId || `session-${Date.now()}`;
    
    console.log(`[DreamsRuntime] Streaming message to agent ${agentId}, session ${sessionId}`);
    
    const self = this;
    
    return {
      async *[Symbol.asyncIterator]() {
        try {
          let fullContent = '';
          
          // Create streaming request following Dreams pattern
          const request = {
            context: self.createAssistantContext(),
            args: {
              sessionId,
              userId: 'default',
              agentInstructions: config.instructions,
              agentName: config.name,
            },
            input: {
              type: 'chat',
              data: {
                sessionId,
                prompt: message,
                userId: 'default',
              },
            },
            handlers: {
              onLogStream: (log: any, done: boolean) => {
                // Handle output logs with content for streaming
                if (log.ref === 'output' && log.type === 'chat:response') {
                  const content = log.data?.content || log.content || '';
                  if (content && content !== fullContent) {
                    const newContent = content.slice(fullContent.length);
                    fullContent = content;
                    return newContent;
                  }
                }
                return '';
              },
            },
          };
          
          // Send with streaming handlers
          const response = await agent.send(request);
          
          // If no streaming occurred, yield the full response
          if (!fullContent && Array.isArray(response) && response.length > 0) {
            const outputResponse = response.find(item => item.ref === 'output');
            if (outputResponse && outputResponse.content) {
              yield outputResponse.content;
            }
          }
          
          console.log(`[DreamsRuntime] Stream completed for agent ${agentId}`);
          
        } catch (error: any) {
          console.error(`[DreamsRuntime] Stream error for agent ${agentId}:`, error);
          throw new Error(`Failed to stream message: ${error?.message}`);
        }
      }
    };
  }
  
  /**
   * Get agent info
   */
  getAgent(agentId: string): SimpleAgentConfig | null {
    return this.agentConfigs.get(agentId) || null;
  }
  
  /**
   * List all agents
   */
  listAgents(): SimpleAgentConfig[] {
    return Array.from(this.agentConfigs.values());
  }
  
  /**
   * Delete agent
   */
  deleteAgent(agentId: string): boolean {
    const deleted = this.agents.delete(agentId) && this.agentConfigs.delete(agentId);
    if (deleted) {
      console.log(`[DreamsRuntime] Agent ${agentId} deleted`);
    }
    return deleted;
  }
  
  /**
   * Get wallet info for debugging
   */
  getWalletInfo(): any {
    return this.walletService.getWalletInfo();
  }
}