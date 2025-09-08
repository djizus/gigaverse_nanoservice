export type AgentStatus = 'active' | 'inactive';

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: string;
  context: string;
  instructions?: string;
  status: AgentStatus;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  model: string;
  context: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Session {
  id: string;
  agentId: string;
  title?: string;
  status: 'active' | 'archived';
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  agentId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
