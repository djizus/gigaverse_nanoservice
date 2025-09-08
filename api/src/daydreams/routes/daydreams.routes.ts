import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { AgentService } from '../services/agent.service';
import { ContextRegistryService } from '../services/context-registry.service';
import { CreateAgentInput } from '../types/agent';
import { HybridAgentAdapter } from '../services/hybrid-agent.adapter';
import { AgentRegistry } from '../../infrastructure/agents/agent-registry';

export interface DaydreamsDeps {
  agentService: AgentService;
  contextRegistry: ContextRegistryService;
  daydreamsLLM: DaydreamsAgentService;
  // Optional: New hybrid system
  agentRegistry?: AgentRegistry;
}

export const createDaydreamsRoutes = (deps: DaydreamsDeps) => {
  const app = new Hono();
  
  // Initialize hybrid adapter if new system is available
  const hybridAdapter = deps.agentRegistry ? new HybridAgentAdapter({ 
    agentRegistry: deps.agentRegistry,
    useNewSystem: true 
  }) : null;

  // Contexts
  app.get('/daydreams/contexts', (c) => {
    try {
      if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][HTTP] GET /daydreams/contexts');
      return c.json(deps.contextRegistry.list());
    } catch (err: any) {
      console.error('[Daydreams] contexts error:', err);
      return c.json({ error: err?.message || 'Failed to list contexts' }, 500);
    }
  });

  // Agents CRUD
  app.get('/daydreams/agents', async (c) => {
    try {
      const userId = c.get('userId') as string | undefined;
      if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][HTTP] GET /daydreams/agents userId=', userId);
      const agents = await deps.agentService.listAgents(userId);
      return c.json(agents);
    } catch (err: any) {
      console.error('[Daydreams] list agents error:', err);
      return c.json({ error: err?.message || 'Failed to list agents' }, 500);
    }
  });

  app.post('/daydreams/agents', async (c) => {
    try {
      if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][HTTP] POST /daydreams/agents start');
      const body = await c.req.json();
      const input = body as CreateAgentInput;

      // Minimal validation
      if (!input?.name || !input?.model || !input?.context) {
        return c.json({ error: 'name, model and context are required' }, 400);
      }

      const userId = c.get('userId') as string | undefined;
      if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][HTTP] POST /daydreams/agents bodyKeys=', Object.keys(input || {}), 'userId=', userId);
      const agent = await deps.agentService.createAgent({
        name: input.name,
        model: input.model,
        context: input.context,
        description: input.description,
        instructions: input.instructions,
        status: input.status ?? 'active',
        routerApiKey: (input as any).routerApiKey,
        templateId: input.templateId,
        modelType: input.modelType,
        modelId: input.modelId,
        contexts: input.contexts,
        contextArgs: input.contextArgs,
        mcpConfig: input.mcpConfig,
        userId: userId,
      }, { userId });
      if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][HTTP] POST /daydreams/agents created id=', agent.id, 'owner=', agent.userId);

      return c.json(agent, 201);
    } catch (err: any) {
      console.error('[Daydreams] create agent error:', err);
      return c.json({ error: err?.message || 'Failed to create agent' }, 500);
    }
  });
  
  // NEW: Simple agent creation using hybrid system
  app.post('/daydreams/agents/simple', async (c) => {
    if (!hybridAdapter) {
      return c.json({ error: 'Hybrid system not available' }, 503);
    }
    
    try {
      const body = await c.req.json();
      const { name, instructions, context, model, routerApiKey } = body;
      
      if (!name) {
        return c.json({ error: 'Agent name is required' }, 400);
      }
      
      console.log(`[Daydreams][Simple] Creating agent: ${name}`);
      
      const agent = await hybridAdapter.createAgentWithRegistry({
        name,
        model: model || 'google-vertex/gemini-2.5-flash',
        context: context || 'chat',
        instructions: instructions || `You are ${name}, a helpful assistant.`,
        routerApiKey,
      });
      
      const providerStatus = hybridAdapter.getProviderStatus(agent.id);
      
      return c.json({
        ...agent,
        system: 'hybrid-registry',
        providerStatus,
      }, 201);
      
    } catch (err: any) {
      console.error('[Daydreams][Simple] Create agent error:', err);
      return c.json({ 
        error: err?.message || 'Failed to create agent',
        system: 'hybrid-registry'
      }, 500);
    }
  });

  app.get('/daydreams/agents/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      const agent = await deps.agentService.getAgent(id, userId);
      if (!agent) return c.json({ error: 'Agent not found' }, 404);
      return c.json(agent);
    } catch (err: any) {
      console.error('[Daydreams] get agent error:', err);
      return c.json({ error: err?.message || 'Failed to get agent' }, 500);
    }
  });

  app.delete('/daydreams/agents/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      const ok = await deps.agentService.deleteAgent(id, userId);
      if (!ok) return c.json({ error: 'Agent not found' }, 404);
      return c.json({ success: true });
    } catch (err: any) {
      console.error('[Daydreams] delete agent error:', err);
      return c.json({ error: err?.message || 'Failed to delete agent' }, 500);
    }
  });

  // Send message to agent (creates session if not provided)
  app.post('/daydreams/agents/:id/send', async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      console.log(`[Daydreams][HTTP] POST /daydreams/agents/${id}/send`);
      const agent = await deps.agentService.getAgent(id, userId);
      if (!agent) return c.json({ error: 'Agent not found' }, 404);

      const body = await c.req.json();
      const { message, sessionId, context, args } = body as { message?: string; sessionId?: string; context?: any; args?: any };
      if (!message) return c.json({ error: 'message is required' }, 400);
      console.log(`[Daydreams][HTTP] send body sessionId=${sessionId ?? 'new'} messageLen=${message.length}`);

      const session = await deps.agentService.ensureSession(agent.id, sessionId, userId);
      console.log(`[Daydreams][HTTP] ensured session id=${session.id}`);
      const { reply, user } = await deps.agentService.sendMessage(agent, session, message, { context, args });
      console.log(`[Daydreams][HTTP] persisted user=${user.id} assistant=${reply.id}`);

      return c.json({ sessionId: session.id, user, reply });
    } catch (err: any) {
      console.error('[Daydreams] send message error:', err);
      return c.json({ error: err?.message || 'Failed to send message' }, 500);
    }
  });
  
  // NEW: Simple message sending using hybrid system
  app.post('/daydreams/agents/:id/send/simple', async (c) => {
    if (!hybridAdapter) {
      return c.json({ error: 'Hybrid system not available' }, 503);
    }
    
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      console.log(`[Daydreams][Simple] POST /daydreams/agents/${id}/send/simple`);
      
      const body = await c.req.json();
      const { message, sessionId, context, args } = body;
      
      if (!message) {
        return c.json({ error: 'message is required' }, 400);
      }
      
      // Check if agent exists in new system first
      if (!(await hybridAdapter.hasAgentInRegistry(id))) {
        return c.json({ error: 'Agent not found in hybrid registry' }, 404);
      }
      
      const result = await hybridAdapter.sendMessageWithRegistry(id, message, {
        sessionId,
        context,
        args,
      });
      
      return c.json({
        sessionId: result.sessionId,
        response: result.reply.content,
        system: 'hybrid-registry',
      });
      
    } catch (err: any) {
      console.error('[Daydreams][Simple] Send message error:', err);
      
      if (err?.message?.includes('not found')) {
        return c.json({ error: err.message, system: 'hybrid-registry' }, 404);
      }
      
      if (err?.message?.includes('Payment required')) {
        return c.json({ 
          error: err.message, 
          code: 'PaymentRequired',
          system: 'hybrid-registry'
        }, 402);
      }
      
      return c.json({ 
        error: err?.message || 'Failed to send message',
        system: 'hybrid-registry' 
      }, 500);
    }
  });

  // Streaming reply (SSE) — PoC
  app.post('/daydreams/agents/:id/send/stream', async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      console.log(`[Daydreams][HTTP] POST /daydreams/agents/${id}/send/stream`);
      const agent = await deps.agentService.getAgent(id, userId);
      if (!agent) return c.json({ error: 'Agent not found' }, 404);

      const body = await c.req.json();
      const { message, sessionId, context, args } = body as { message?: string; sessionId?: string; context?: any; args?: any };
      if (!message) return c.json({ error: 'message is required' }, 400);
      // Runtime-only prechecks
      if (!deps.daydreamsLLM.isEnabled) {
        return c.json({ error: 'PaymentRequired', message: 'Daydreams Router not initialized (payment auth required)' }, 402);
      }
      if (!deps.daydreamsLLM.hasRuntime(agent.id)) {
        try { deps.daydreamsLLM.registerAgent({ id: agent.id, model: agent.model, name: agent.name, context: agent.context, instructions: agent.instructions }); } catch {}
        if (!deps.daydreamsLLM.hasRuntime(agent.id)) {
          return c.json({ error: 'RuntimeNotFound', message: `Runtime not registered for agent ${agent.id}` }, 404);
        }
      }


      const session = await deps.agentService.ensureSession(agent.id, sessionId, userId);
      await deps.agentService.addUserMessage(agent.id, session.id, message);

      return streamSSE(c, async (sse) => {
        await sse.writeSSE({ event: 'start', data: JSON.stringify({ sessionId: session.id }) });

        try {
          const textStream = await deps.daydreamsLLM.stream(agent.id, { input: message, context, args }, { temperature: 0.2 });
          let finalText = '';
          for await (const delta of textStream) {
            finalText += delta;
            await sse.writeSSE({ data: JSON.stringify({ delta }) });
          }
          await deps.agentService.addAssistantMessage(agent.id, session.id, finalText);
        } catch (llmErr: any) {
          console.error('[Daydreams][HTTP] LLM stream error:', llmErr?.message || llmErr);
          try {
            console.error('[Daydreams][HTTP] LLM error details', {
              name: llmErr?.name,
              url: llmErr?.url,
              statusCode: llmErr?.statusCode,
              requestBodyValues: llmErr?.requestBodyValues,
              responseBody: llmErr?.responseBody,
              responseHeaders: llmErr?.responseHeaders,
            });
          } catch {}
          if (llmErr?.stack) console.error(llmErr.stack);
          await sse.writeSSE({ event: 'error', data: JSON.stringify({ error: llmErr?.code || 'StreamError', message: llmErr?.message || 'LLM stream failed' }) });
        }

        await sse.writeSSE({ event: 'done', data: '{}' });
      });
    } catch (err: any) {
      console.error('[Daydreams] send message stream error:', err);
      return c.json({ error: err?.message || 'Failed to stream message' }, 500);
    }
  });

  // List sessions for agent
  app.get('/daydreams/agents/:id/sessions', async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId') as string | undefined;
      const agent = await deps.agentService.getAgent(id, userId);
      if (!agent) return c.json({ error: 'Agent not found' }, 404);
      const sessions = await deps.agentService.listAgentSessions(agent.id, userId);
      return c.json(sessions);
    } catch (err: any) {
      console.error('[Daydreams] list sessions error:', err);
      return c.json({ error: err?.message || 'Failed to list sessions' }, 500);
    }
  });

  // List messages for a session
  app.get('/daydreams/sessions/:sessionId/messages', async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      const userId = c.get('userId') as string | undefined;
      // Check: ensure session belongs to user (if userId present)
      const session = await deps.agentService.getSession(sessionId, userId).catch(() => null);
      if (!session) return c.json({ error: 'Session not found' }, 404);
      const messages = await deps.agentService.listMessages(sessionId);
      return c.json(messages);
    } catch (err: any) {
      console.error('[Daydreams] list messages error:', err);
      return c.json({ error: err?.message || 'Failed to list messages' }, 500);
    }
  });

  return app;
};
