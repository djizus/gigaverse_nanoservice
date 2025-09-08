import { AgentConfig, CreateAgentInput, UpdateAgentInput } from "../types/agent";
import { Message, Session } from "../types/session";

export interface DaydreamsStorage {
  // Agents
  listAgents(opts?: { userId?: string }): Promise<AgentConfig[]>;
  createAgent(input: CreateAgentInput, opts?: { userId?: string }): Promise<AgentConfig>;
  getAgent(id: string, opts?: { userId?: string }): Promise<AgentConfig | null>;
  updateAgent(id: string, input: UpdateAgentInput, opts?: { userId?: string }): Promise<AgentConfig | null>;
  deleteAgent(id: string, opts?: { userId?: string }): Promise<boolean>;
  // Templates (optional; SupabaseStorage implements)
  getTemplateById?(id: string): Promise<{
    id: string;
    name: string;
    description?: string;
    model?: string;
    context?: string;
    instructions?: string;
    variables?: any;
    tags?: any;
  } | null>;

  // Sessions
  createSession(agentId: string, title?: string, opts?: { daydreamsKey?: string; name?: string }): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listAgentSessions(agentId: string): Promise<Session[]>;

  // Messages
  addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
  listMessages(sessionId: string): Promise<Message[]>;
}
