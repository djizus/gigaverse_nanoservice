import { Context, Next } from 'hono';
import { AgentRegistry } from '../../infrastructure/agents/agent-registry';
import { DreamsConfig } from '../types/agent.types';

export interface DreamsAuthOptions {
  agentRegistry: AgentRegistry;
  requireAuth?: boolean;
  onAuthError?: (c: Context, error: string) => Response | Promise<Response>;
}

export const createDreamsAuthMiddleware = (options: DreamsAuthOptions) => {
  return async (c: Context, next: Next) => {
    try {
      // Extract agent ID from path params
      const agentId = c.req.param('agentId') || c.req.param('id');
      
      if (!agentId) {
        if (options.requireAuth !== false) {
          const error = 'Agent ID required in path';
          if (options.onAuthError) {
            return options.onAuthError(c, error);
          }
          return c.json({ error, code: 'AGENT_ID_REQUIRED' }, 400);
        }
        await next();
        return;
      }
      
      // Check if agent exists
      const agent = await options.agentRegistry.getAgent(agentId);
      if (!agent) {
        const error = `Agent ${agentId} not found`;
        if (options.onAuthError) {
          return options.onAuthError(c, error);
        }
        return c.json({ error, code: 'AGENT_NOT_FOUND' }, 404);
      }
      
      // Check provider authentication status
      const providerStatus = options.agentRegistry.getProviderStatus(agentId);
      if (!providerStatus.authenticated) {
        const error = `Agent ${agentId} provider not authenticated: ${providerStatus.error || 'Unknown error'}`;
        if (options.onAuthError) {
          return options.onAuthError(c, error);
        }
        return c.json({ 
          error, 
          code: 'PROVIDER_NOT_AUTHENTICATED',
          details: providerStatus 
        }, 402);
      }
      
      // Attach agent and registry to context
      c.set('agent', agent);
      c.set('agentRegistry', options.agentRegistry);
      c.set('providerStatus', providerStatus);
      
      await next();
    } catch (error: any) {
      console.error('[DreamsAuthMiddleware] Error:', error);
      
      if (options.onAuthError) {
        return options.onAuthError(c, error?.message || 'Authentication failed');
      }
      
      return c.json({ 
        error: error?.message || 'Authentication failed',
        code: 'AUTH_ERROR'
      }, 500);
    }
  };
};

export const createDreamsPaymentMiddleware = () => {
  return async (c: Context, next: Next) => {
    // This middleware can be used to handle x402 payment-specific logic
    // For now, it's a pass-through since payment handling is in the registry
    
    const providerStatus = c.get('providerStatus');
    
    if (providerStatus?.method === 'payment') {
      // Add payment-specific headers or logic here
      c.header('X-Payment-Method', 'x402-usdc');
    } else if (providerStatus?.method === 'apikey') {
      c.header('X-Auth-Method', 'dreams-api-key');
    }
    
    await next();
  };
};