/**
 * Types for Model Context Protocol (MCP) integration
 */

/**
 * Available MCP transport types
 */
export type McpTransportType = 'stdio' | 'http' | 'websocket' | 'sse';

/**
 * MCP Server transport configuration for stdio (process-based)
 */
export interface McpStdioTransport {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * MCP Server transport configuration for HTTP
 */
export interface McpHttpTransport {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * MCP Server transport configuration for WebSocket
 */
export interface McpWebSocketTransport {
  type: 'websocket';
  url: string;
  headers?: Record<string, string>;
  reconnectInterval?: number;
}

/**
 * MCP Server transport configuration for Server-Sent Events
 */
export interface McpSseTransport {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

/**
 * Union type for all transport configurations
 */
export type McpTransport =
  | McpStdioTransport
  | McpHttpTransport
  | McpWebSocketTransport
  | McpSseTransport;

/**
 * MCP Server configuration
 */
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

/**
 * MCP Extension configuration for agents
 */
export interface McpExtensionConfig {
  enabled: boolean;
  servers: McpServerConfig[];
  globalTimeout?: number;
  maxConcurrentConnections?: number;
}

/**
 * MCP Server status
 */
export type McpServerStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * MCP Server runtime information
 */
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

/**
 * MCP tool definition
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP resource definition
 */
export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt definition
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, unknown>;
}

/**
 * MCP Server capabilities
 */
export interface McpServerCapabilities {
  tools?: McpTool[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
}

/**
 * Pre-configured MCP server templates
 */
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

/**
 * MCP connection event types
 */
export type McpEventType =
  | 'server_connected'
  | 'server_disconnected'
  | 'server_error'
  | 'tool_called'
  | 'resource_accessed'
  | 'prompt_used';

/**
 * MCP event data
 */
export interface McpEvent {
  type: McpEventType;
  serverId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: string;
}
