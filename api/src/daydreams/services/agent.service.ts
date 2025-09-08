import { DaydreamsStorage } from './storage.interface';
import { AgentConfig, CreateAgentInput } from '../types/agent';
import { Message, Session } from '../types/session';

import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';

export class AgentService {
  constructor(private storage: DaydreamsStorage, private llm?: DaydreamsAgentService) {}

  // Agents
  listAgents(userId?: string): Promise<AgentConfig[]> {
    return this.storage.listAgents(userId ? { userId } : undefined);
  }

  async createAgent(input: CreateAgentInput, opts?: { userId?: string }): Promise<AgentConfig> {
    if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][AgentService.createAgent] start userId(input)=', input.userId, 'userId(opts)=', opts?.userId);
    // Merge from template if provided
    let merged = { ...input } as CreateAgentInput;
    if (input.templateId && this.storage.getTemplateById) {
      try {
        const tpl = await this.storage.getTemplateById(input.templateId);
        if (tpl) {
          merged = {
            ...tpl.model ? { model: input.model || tpl.model } : {},
            ...tpl.context ? { context: input.context || tpl.context } : {},
            ...tpl.instructions ? { instructions: input.instructions || tpl.instructions } : {},
            ...merged,
          } as CreateAgentInput;
          if (!merged.name) merged.name = tpl.name;
          if (!merged.description && tpl.description) merged.description = tpl.description;
        }
      } catch (e: any) {
        console.warn('[Daydreams][AgentService.createAgent] template merge failed:', e?.message || e);
      }
    }

    const agent = await this.storage.createAgent(merged, opts);
    if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][AgentService.createAgent] storage created agent id=', agent.id, 'owner=', agent.userId);
    // Register agent runtime (linked to DaydreamsAgentService)
    try {
      if (input.routerApiKey) {
        this.llm?.registerAgentWithApiKey({ id: agent.id, name: agent.name, context: agent.context, instructions: agent.instructions }, input.routerApiKey);
      } else {
        this.llm?.registerAgent({ id: agent.id, model: agent.model, name: agent.name, context: agent.context, instructions: agent.instructions });
      }
    } catch (e: any) {
      console.warn('[Daydreams][AgentService.createAgent] failed to register agent runtime:', e?.message || e);
    }
    // Auto-bootstrap a default Daydreams-linked session for this agent
    try {
      const daydreamsKey = `agent-${agent.id}`; // simple deterministic link; can be randomUUID()
      await this.storage.createSession(agent.id, input.name || 'Default', { daydreamsKey, name: 'Default Session' });
      console.log(`[Daydreams][AgentService.createAgent] bootstrapped session for agent=${agent.id} daydreamsKey=${daydreamsKey}`);
    } catch (e: any) {
      console.warn('[Daydreams][AgentService.createAgent] failed to bootstrap default session:', e?.message || e);
    }
    return agent;
  }

  // Runtime helpers (proxy to LLM registry)
  getRuntime(agentId: string) {
    const res=this.llm?.getRuntime(agentId);
    console.log(`[Daydreams][AgentService.getRuntime] agent=${agentId} runtime=${JSON.stringify(res)}`);
    return res;
  }

  listRegisteredAgents() {
    return this.llm?.listRegisteredAgents() ?? [];
  }

  getAgent(id: string, userId?: string): Promise<AgentConfig | null> {
    return this.storage.getAgent(id, userId ? { userId } : undefined);
  }

  deleteAgent(id: string, userId?: string): Promise<boolean> {
    return this.storage.deleteAgent(id, userId ? { userId } : undefined);
  }

  // Sessions
  async ensureSession(agentId: string, sessionId?: string, _userId?: string): Promise<Session> {
    if (sessionId) {
      const existing = await this.storage.getSession(sessionId);
      if (existing) return existing;
    }
    return this.storage.createSession(agentId);
  }

  async getSession(sessionId: string, userId?: string) {
    const session = await this.storage.getSession(sessionId);
    if (!session) return null;
    if (!userId) return session;
    // Verify via agent ownership (since sessions don't carry user_id in DB)
    const agent = await this.getAgent(session.agentId, userId);
    if (!agent) return null;
    return session;
  }

  listAgentSessions(agentId: string, _userId?: string) {
    return this.storage.listAgentSessions(agentId);
  }

  listMessages(sessionId: string) {
    return this.storage.listMessages(sessionId);
  }

  // Messaging: runtime-only (no fallback)
  async sendMessage(
    agent: AgentConfig,
    session: Session,
    content: string,
    opts?: { context?: any; args?: any }
  ): Promise<{ reply: Message; user: Message; }>{
    try {
      console.log(`[Daydreams][AgentService.sendMessage] agent=${agent.id} session=${session.id} contentLen=${content?.length ?? 0} content=${JSON.stringify(content)}`);
      // Store user message
      const userMsg = await this.storage.addMessage({
        agentId: agent.id,
        sessionId: session.id,
        role: 'user',
        content,
      });

      // Ensure runtime is registered (created or preloaded at boot)
      if (this.llm && !this.llm.hasRuntime(agent.id)) {
        this.llm.registerAgent({ id: agent.id, model: agent.model, name: agent.name, context: agent.context, instructions: agent.instructions });
      }
      const assistantText = await this.llm!.send(
        agent.id,
        { input: content, context: opts?.context, args: opts?.args },
        { temperature: 0.2 }
      );

      const reply = await this.storage.addMessage({
        agentId: agent.id,
        sessionId: session.id,
        role: 'assistant',
        content: assistantText,
      });

      console.log(`[Daydreams][AgentService.sendMessage] persisted user=${userMsg.id} assistant=${reply.id} assistantContent=${JSON.stringify(assistantText)}`);
      return { reply, user: userMsg };
    } catch (e: any) {
      console.error('[Daydreams][AgentService.sendMessage] error:', e?.message || e);
      // Surface Payment/runtime errors up to route (so it can 402/404 accordingly)
      throw e;
    }
  }

  // Expose minimal helpers for streaming routes
  addUserMessage(agentId: string, sessionId: string, content: string) {
    console.log(`[Daydreams][AgentService.addUserMessage] agent=${agentId} session=${sessionId} contentLen=${content?.length ?? 0} content=${JSON.stringify(content)}`);
    return this.storage.addMessage({ agentId, sessionId, role: 'user', content });
  }

  addAssistantMessage(agentId: string, sessionId: string, content: string) {
    console.log(`[Daydreams][AgentService.addAssistantMessage] agent=${agentId} session=${sessionId} contentLen=${content?.length ?? 0} content=${JSON.stringify(content)}`);
    return this.storage.addMessage({ agentId, sessionId, role: 'assistant', content });
  }
}
