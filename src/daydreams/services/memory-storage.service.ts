import { randomUUID } from 'node:crypto';
import { DaydreamsStorage } from './storage.interface';
import { AgentConfig, CreateAgentInput, UpdateAgentInput } from '../types/agent';
import { Message, Session } from '../types/session';

export class MemoryStorage implements DaydreamsStorage {
  private agents: AgentConfig[] = [];
  private sessions: Session[] = [];
  private messages: Message[] = [];

  async listAgents(): Promise<AgentConfig[]> {
    return [...this.agents];
  }

  async createAgent(input: CreateAgentInput): Promise<AgentConfig> {
    const now = new Date().toISOString();
    const agent: AgentConfig = {
      id: randomUUID(),
      name: input.name,
      model: input.model,
      context: input.context,
      description: input.description,
      instructions: input.instructions,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.agents.push(agent);
    return agent;
  }

  async getAgent(id: string): Promise<AgentConfig | null> {
    return this.agents.find(a => a.id === id) ?? null;
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<AgentConfig | null> {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const updated: AgentConfig = {
      ...this.agents[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.agents[idx] = updated;
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const before = this.agents.length;
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
    return this.sessions.find(s => s.id === id) ?? null;
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
