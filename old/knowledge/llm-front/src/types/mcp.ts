/**
 * Types for MCP (Model Context Protocol) integration in the frontend
 */

export type McpTransportType = 'stdio' | 'http' | 'websocket' | 'sse';

export interface McpStdioTransport {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface McpHttpTransport {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface McpWebSocketTransport {
  type: 'websocket';
  url: string;
  headers?: Record<string, string>;
  reconnectInterval?: number;
}

export interface McpSseTransport {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export type McpTransport =
  | McpStdioTransport
  | McpHttpTransport
  | McpWebSocketTransport
  | McpSseTransport;

export interface McpServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: McpTransport;
  enabled?: boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface McpExtensionConfig {
  enabled: boolean;
  servers: McpServerConfig[];
  globalTimeout?: number;
  maxConcurrentConnections?: number;
}

export type McpServerStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface McpServerInfo {
  id: string;
  status: McpServerStatus;
  lastConnected?: Date;
  lastError?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, unknown>;
}

export interface McpServerCapabilities {
  tools?: McpTool[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
}

export interface McpServerTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'data' | 'communication' | 'development' | 'other';
  icon?: string;
  transport: McpTransport;
  requiredEnvVars?: string[];
  defaultConfig?: Partial<McpServerConfig>;
  setupInstructions?: string;
}

// Frontend-specific types
export interface McpServerSelection {
  template: McpServerTemplate;
  config: Partial<McpServerConfig>;
  selected: boolean;
}
