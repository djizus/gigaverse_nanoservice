export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Session {
  id: string;
  agentId: string;
  title?: string;
  status: 'active' | 'archived';
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

