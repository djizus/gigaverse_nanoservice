export type ModelType = 'anthropic' | 'openai' | 'groq';
export type ModelId = string;
export type AgentStatus = 'active' | 'inactive' | 'paused' | 'deleted';

export interface Template {
  id: string;
  name: string;
  description: string;
  content?: string;
  variables?: Array<{
    name: string;
    description: string;
    defaultValue: string;
  }>;
  context: {
    type: string;
    schema?: any;
    defaultArgs?: any;
  };
  defaultArgs?: Record<string, Record<string, unknown>>;
}

export interface AgentContextArgs {
  sessionId: string;
  userId: string;
  template?: {
    content?: string;
    variables?: Array<{
      name: string;
      description: string;
      defaultValue: string;
    }>;
    context?: {
      type: string;
      schema?: any;
      defaultArgs?: any;
    };
    name?: string;
    description?: string;
    id?: string;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  modelType: ModelType;
  modelId: ModelId;
  contexts: string[];
  contextArgs: Record<string, AgentContextArgs>;
  status: AgentStatus;
  // capabilities: AgentCapabilities | string[]; // Support both old and new format
  stats: {
    totalConversations: number;
    averageResponseTime: number;
    successRate: number;
    lastActive: string;
  };
}

export interface Agent {
  id: string;
  config: AgentConfig;
}

export interface AgentCapabilities {
  canBrowseWeb?: boolean;
  canAccessFiles?: boolean;
  canExecuteCode?: boolean;
  canUseMcp?: boolean;
  allowedMcpServers?: string[];
  custom?: Record<string, any>;
}

export interface CreateAgentDto {
  id?: string;
  templateId?: string;
  name?: string;
  description?: string;
  instructions?: string;
  instructionsMode?: 'replace' | 'append' | 'prepend';
  modelType?: ModelType;
  modelId?: ModelId;
  contexts?: string[];
  contextArgs?: Record<string, AgentContextArgs>;
  capabilities?: AgentCapabilities;
  stats?: Record<string, any>;
  metadata?: Record<string, any>;
  customArgs?: Record<string, unknown>;
}

export interface UpdateAgentDto extends Partial<Omit<CreateAgentDto, 'id'>> {
  status?: AgentStatus;
}

export interface AgentResponse {
  agents: Agent[];
}

export interface SingleAgentResponse {
  agent: Agent;
}
