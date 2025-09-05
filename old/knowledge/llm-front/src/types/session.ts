export type { Agent } from './agent';

export interface Session {
  id: string;
  name: string;
  agentId: string;
  createdAt: number;
  updatedAt?: number;
  messages?: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  rawResponse?: ResponseItem[] | any;
  activeFilter?: string;
  showDetails?: boolean;
}

export interface ResponseItem {
  id: string;
  ref: string;
  type: string;
  name?: string;
  data?: Record<string, unknown>;
  content?: string;
  prompt?: string;
  response?: string;
  processed?: boolean;
  timestamp?: number;
  step?: number;
  formatted?: Record<string, unknown>;
}
