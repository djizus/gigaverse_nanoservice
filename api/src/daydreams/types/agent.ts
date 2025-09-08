export type AgentStatus = 'active' | 'inactive';

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: string;
  modelType?: string;
  context: string; // e.g. 'chat' | 'gigaverse'
  contexts?: string[];
  contextArgs?: Record<string, any>;
  mcpConfig?: any;
  capabilities?: any;
  stats?: any;
  instructions?: string;
  status: AgentStatus;
  // Optional owner scoping
  userId?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateAgentInput {
  name: string;
  model: string;
  context: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
  // llm-api compatibility
  templateId?: string;
  modelType?: string;
  modelId?: string;
  contexts?: string[];
  contextArgs?: Record<string, any>;
  mcpConfig?: any;
  // runtime-only: optional per-agent router API key (not persisted)
  routerApiKey?: string;
  // Optional owner scoping
  userId?: string;
}

export interface UpdateAgentInput {
  name?: string;
  model?: string;
  context?: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
  modelType?: string;
  modelId?: string;
  contexts?: string[];
  contextArgs?: Record<string, any>;
  mcpConfig?: any;
}
