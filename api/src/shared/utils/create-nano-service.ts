import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { AgentRegistry } from '../../infrastructure/agents/agent-registry';
import { SimpleAgentConfig, SendMessageOptions } from '../types/agent.types';
import { PaymentConfig } from '../types/payment';
import { createDreamsAuthMiddleware, createDreamsPaymentMiddleware } from '../middleware/dreams-auth.middleware';

export interface NanoServiceConfig {
  domain: string;
  agentConfig: Omit<SimpleAgentConfig, 'id'>;
  paymentConfig?: PaymentConfig;
  enableHealthCheck?: boolean;
  enableMetrics?: boolean;
}

export interface NanoServiceContext {
  agentRegistry: AgentRegistry;
  agentId?: string;
}

export const createNanoService = (config: NanoServiceConfig, context: NanoServiceContext) => {
  const app = new Hono();
  
  // Create agent if not provided
  let agentId = context.agentId;
  
  // Initialize agent on first request if needed
  app.use('/*', async (c, next) => {
    if (!agentId) {
      try {
        agentId = await context.agentRegistry.createAgent(config.agentConfig);
        console.log(`[NanoService:${config.domain}] Created agent: ${agentId}`);
      } catch (error: any) {
        console.error(`[NanoService:${config.domain}] Failed to create agent:`, error);
        return c.json({ 
          error: 'Failed to initialize agent', 
          details: error?.message,
          code: 'AGENT_INIT_FAILED'
        }, 500);
      }
    }
    
    // Attach agent ID to context for auth middleware
    c.set('currentAgentId', agentId);
    await next();
  });
  
  // Dreams authentication middleware
  app.use('/*', createDreamsAuthMiddleware({
    agentRegistry: context.agentRegistry,
    requireAuth: true,
    onAuthError: (c, error) => {
      return c.json({ 
        error, 
        domain: config.domain,
        code: 'DREAMS_AUTH_ERROR'
      }, 402);
    }
  }));
  
  // Payment method indicator middleware
  app.use('/*', createDreamsPaymentMiddleware());
  
  // Health check endpoint (if enabled)
  if (config.enableHealthCheck !== false) {
    app.get(`/${config.domain}/health`, async (c) => {
      const agentRegistry = c.get('agentRegistry') as AgentRegistry;
      const agent = c.get('agent') as SimpleAgentConfig;
      const providerStatus = c.get('providerStatus');
      
      return c.json({
        status: 'healthy',
        domain: config.domain,
        agent: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
        },
        provider: providerStatus,
        timestamp: new Date().toISOString(),
      });
    });
  }
  
  // Agent info endpoint
  app.get(`/${config.domain}/info`, async (c) => {
    const agent = c.get('agent') as SimpleAgentConfig;
    const providerStatus = c.get('providerStatus');
    
    return c.json({
      domain: config.domain,
      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        context: agent.context,
        status: agent.status,
      },
      provider: providerStatus,
      features: {
        healthCheck: config.enableHealthCheck !== false,
        metrics: config.enableMetrics === true,
        streaming: true,
        sessions: true,
      }
    });
  });
  
  // Send message endpoint
  app.post(`/${config.domain}`, async (c) => {
    try {
      const agentRegistry = c.get('agentRegistry') as AgentRegistry;
      const agent = c.get('agent') as SimpleAgentConfig;
      
      const body = await c.req.json();
      const { 
        message, 
        sessionId, 
        context: messageContext, 
        args, 
        temperature 
      } = body;
      
      if (!message) {
        return c.json({ error: 'Message is required', code: 'MESSAGE_REQUIRED' }, 400);
      }
      
      const options: SendMessageOptions = {
        sessionId,
        context: messageContext,
        args,
        temperature,
      };
      
      const result = await agentRegistry.sendMessage(agent.id, message, options);
      
      return c.json({
        success: true,
        domain: config.domain,
        agentId: agent.id,
        sessionId: result.sessionId,
        response: result.response,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      console.error(`[NanoService:${config.domain}] Send message error:`, error);
      
      return c.json({
        error: error?.message || 'Failed to process message',
        domain: config.domain,
        code: 'MESSAGE_PROCESSING_ERROR'
      }, 500);
    }
  });
  
  // Stream message endpoint
  app.post(`/${config.domain}/stream`, async (c) => {
    try {
      const agentRegistry = c.get('agentRegistry') as AgentRegistry;
      const agent = c.get('agent') as SimpleAgentConfig;
      
      const body = await c.req.json();
      const { 
        message, 
        sessionId, 
        context: messageContext, 
        args, 
        temperature 
      } = body;
      
      if (!message) {
        return c.json({ error: 'Message is required', code: 'MESSAGE_REQUIRED' }, 400);
      }
      
      const options: SendMessageOptions = {
        sessionId,
        context: messageContext,
        args,
        temperature,
      };
      
      return streamSSE(c, async (sse) => {
        try {
          await sse.writeSSE({ 
            event: 'start', 
            data: JSON.stringify({ 
              domain: config.domain, 
              agentId: agent.id 
            })
          });
          
          const stream = await agentRegistry.streamMessage(agent.id, message, options);
          
          for await (const chunk of stream) {
            if (chunk.type === 'chunk') {
              await sse.writeSSE({ 
                event: 'chunk',
                data: JSON.stringify({ delta: chunk.data })
              });
            } else if (chunk.type === 'done') {
              await sse.writeSSE({ 
                event: 'done',
                data: JSON.stringify({ message: 'Stream completed' })
              });
              break;
            } else if (chunk.type === 'error') {
              await sse.writeSSE({ 
                event: 'error',
                data: JSON.stringify({ error: chunk.data })
              });
              break;
            }
          }
          
        } catch (error: any) {
          console.error(`[NanoService:${config.domain}] Stream error:`, error);
          await sse.writeSSE({ 
            event: 'error',
            data: JSON.stringify({ 
              error: error?.message || 'Stream failed',
              code: 'STREAM_ERROR'
            })
          });
        }
      });
      
    } catch (error: any) {
      console.error(`[NanoService:${config.domain}] Stream setup error:`, error);
      return c.json({
        error: error?.message || 'Failed to setup stream',
        domain: config.domain,
        code: 'STREAM_SETUP_ERROR'
      }, 500);
    }
  });
  
  // Session management endpoints
  app.get(`/${config.domain}/sessions`, async (c) => {
    try {
      const agentRegistry = c.get('agentRegistry') as AgentRegistry;
      const agent = c.get('agent') as SimpleAgentConfig;
      
      const sessions = agentRegistry.listSessions(agent.id);
      
      return c.json({
        domain: config.domain,
        agentId: agent.id,
        sessions: sessions.map(session => ({
          id: session.id,
          messageCount: session.messages.length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          status: session.status,
        })),
      });
      
    } catch (error: any) {
      console.error(`[NanoService:${config.domain}] List sessions error:`, error);
      return c.json({
        error: error?.message || 'Failed to list sessions',
        code: 'SESSIONS_LIST_ERROR'
      }, 500);
    }
  });
  
  app.get(`/${config.domain}/sessions/:sessionId`, async (c) => {
    try {
      const agentRegistry = c.get('agentRegistry') as AgentRegistry;
      const sessionId = c.req.param('sessionId');
      
      const session = agentRegistry.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }, 404);
      }
      
      return c.json({
        domain: config.domain,
        session: {
          id: session.id,
          agentId: session.agentId,
          messages: session.messages,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          status: session.status,
        },
      });
      
    } catch (error: any) {
      console.error(`[NanoService:${config.domain}] Get session error:`, error);
      return c.json({
        error: error?.message || 'Failed to get session',
        code: 'SESSION_GET_ERROR'
      }, 500);
    }
  });
  
  return app;
};

// Helper function to create a simple chat nano service
export const createChatNanoService = (config: {
  domain: string;
  agentName: string;
  instructions?: string;
  model?: string;
}, context: NanoServiceContext) => {
  return createNanoService({
    domain: config.domain,
    agentConfig: {
      name: config.agentName,
      model: config.model || 'google-vertex/gemini-2.5-flash',
      context: 'chat',
      instructions: config.instructions || `You are ${config.agentName}, a helpful assistant.`,
      dreams: {
        apiKey: process.env.DREAMS_ROUTER_API_KEY,
        model: config.model || 'google-vertex/gemini-2.5-flash',
        timeoutMs: 30000,
      },
    },
    enableHealthCheck: true,
  }, context);
};