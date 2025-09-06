export interface SimpleAgentConfig {
  id: string;
  name: string;
  model: string;
  context?: string;
  instructions?: string;
  status?: 'active' | 'inactive';
  dreams: DreamsConfig;
  templateId?: string;
  sessionConfig?: SessionConfig;
}

export interface DreamsConfig {
  // API Key method (preferred if available)
  apiKey?: string;
  
  // x402 micropayment method (fallback)
  payment?: {
    amount: string; // "100000" = $0.10 USDC per request
    network: "base-sepolia" | "base";
    privateKey?: string;
    address?: string;
  };
  
  // Model configuration
  model: string; // "google-vertex/gemini-2.5-flash"
  timeoutMs: number;
  temperature?: number;
}

export interface SessionConfig {
  persistMessages?: boolean;
  maxMessages?: number;
  sessionTimeoutMs?: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sessionId: string;
  agentId: string;
}

export interface AgentSession {
  id: string;
  agentId: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
}

export interface StreamResponse {
  type: 'chunk' | 'done' | 'error';
  data: string | { error: string; code?: string };
}

export interface SendMessageOptions {
  sessionId?: string;
  context?: any;
  args?: any;
  temperature?: number;
}