export interface Session {
  id: string;
  agentId: string; // ID of the selected agent
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface CreateSessionDto {
  agentId: string; // Required agent ID when creating a session
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}
