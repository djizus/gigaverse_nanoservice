import { randomUUID } from 'node:crypto';
import { DaydreamsStorage } from './storage.interface';
import { AgentConfig, CreateAgentInput, UpdateAgentInput } from '../types/agent';
import { Message, Session } from '../types/session';

export class MemoryStorage implements DaydreamsStorage {
  private agents: AgentConfig[] = [];
  private sessions: Session[] = [];
  private messages: Message[] = [];

  async listAgents(opts?: { userId?: string }): Promise<AgentConfig[]> {
    if (opts?.userId) return this.agents.filter(a => a.userId === opts.userId);
    return [...this.agents];
  }

  async createAgent(input: CreateAgentInput, opts?: { userId?: string }): Promise<AgentConfig> {
    if (process.env.LOG_LEVEL === 'debug') console.log('[Daydreams][Storage][Memory] createAgent userId=', input.userId || opts?.userId);
    const now = new Date().toISOString();
    const agent: AgentConfig = {
      id: randomUUID(),
      name: input.name,
      model: input.model,
      context: input.context,
      description: input.description,
      instructions: input.instructions,
      status: input.status ?? 'active',
      userId: input.userId || opts?.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.push(agent);
    return agent;
  }

  async getAgent(id: string, opts?: { userId?: string }): Promise<AgentConfig | null> {
    const a = this.agents.find(a => a.id === id) ?? null;
    if (!a) return null;
    if (opts?.userId && a.userId && a.userId !== opts.userId) return null;
    return a;
  }

  async updateAgent(id: string, input: UpdateAgentInput, opts?: { userId?: string }): Promise<AgentConfig | null> {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) return null;
    if (opts?.userId && this.agents[idx].userId && this.agents[idx].userId !== opts.userId) return null;
    const updated: AgentConfig = {
      ...this.agents[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.agents[idx] = updated;
    return updated;
  }

  async deleteAgent(id: string, opts?: { userId?: string }): Promise<boolean> {
    const before = this.agents.length;
    const agent = this.agents.find(a => a.id === id);
    if (!agent) return false;
    if (opts?.userId && agent.userId && agent.userId !== opts.userId) return false;
    this.agents = this.agents.filter(a => a.id !== id);
    // Also cascade-delete sessions/messages in memory for cleanliness
    const sessionsToDelete = this.sessions.filter(s => s.agentId === id).map(s => s.id);
    this.sessions = this.sessions.filter(s => s.agentId !== id);
    this.messages = this.messages.filter(m => !sessionsToDelete.includes(m.sessionId));
    return this.agents.length < before;
  }

  async createSession(agentId: string, title?: string, _opts?: { daydreamsKey?: string; name?: string }): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: randomUUID(),
      agentId,
      title,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(session);
    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    const s = this.sessions.find(s => s.id === id) ?? null;
    return s;
  }

  async listAgentSessions(agentId: string): Promise<Session[]> {
    return this.sessions.filter(s => s.agentId === agentId);
  }

  async addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const msg: Message = {
      ...message,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.messages.push(msg);
    return msg;
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    return this.messages.filter(m => m.sessionId === sessionId);
  }
}
