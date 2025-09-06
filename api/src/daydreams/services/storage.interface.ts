import { AgentConfig, CreateAgentInput, UpdateAgentInput } from "../types/agent";
import { Message, Session } from "../types/session";

export interface DaydreamsStorage {
  // Agents
  listAgents(): Promise<AgentConfig[]>;
  createAgent(input: CreateAgentInput): Promise<AgentConfig>;
  getAgent(id: string): Promise<AgentConfig | null>;
  updateAgent(id: string, input: UpdateAgentInput): Promise<AgentConfig | null>;
  deleteAgent(id: string): Promise<boolean>;
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
