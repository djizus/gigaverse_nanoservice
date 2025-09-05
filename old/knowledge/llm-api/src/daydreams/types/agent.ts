import { ModelType, ModelId } from './models';
import type { AnyContext } from '@daydreamsai/core';
import { McpExtensionConfig } from './mcp';

export type AgentStatus = 'active' | 'inactive' | 'busy';

export interface AgentStats {
  totalConversations: number;
  averageResponseTime: number;
  successRate: number;
  lastActive: string;
}

/**
 * Template structure for creating agents from predefined configurations
 */
export interface AgentTemplate {
  id: string;
  content?: string;
  variables?: Array<{
    name: string;
    description: string;
    defaultValue?: string;
  }>;
  context?: {
    type: string;
    schema?: any;
    defaultArgs?: any;
  };
  name?: string;
  description?: string;
  // MCP configuration for template
  mcpConfig?: McpExtensionConfig;
}

/**
 * Arguments for context instances following Daydreams schema pattern
 */
export interface AgentContextArgs {
  sessionId: string;
  userId: string;
  title?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Complete agent configuration following Daydreams architecture
 */
export interface AgentConfig {
  id: string;
  modelType: ModelType;
  modelId: ModelId;
  name: string;
  description: string;
  instructions: string;
  contexts: string[]; // Context type identifiers
  contextArgs: Record<string, AgentContextArgs>; // Arguments for each context instance
  status: AgentStatus;
  capabilities: string[]; // Required by database
  stats: AgentStats;
  // MCP Extension configuration
  mcpConfig?: McpExtensionConfig;
  // Optional Daydreams-specific configuration
  maxSteps?: number;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

/**
 * Agent runtime instance combining config with active contexts
 */
export interface AgentInstance {
  id: string;
  config: AgentConfig;
  contexts: AnyContext[];
  isInitialized: boolean;
  lastActivity: number;
}

/**
 * Response structure for agent operations
 */
export interface AgentResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * DTO for creating new agents - supports both direct creation and template-based creation
 */
export interface CreateAgentDto {
  templateId?: string;

  modelType: ModelType;
  modelId: ModelId;
  name?: string;
  description?: string;
  instructions?: string;

  contexts?: string[];
  contextArgs?: Record<string, AgentContextArgs>;

  maxSteps?: number;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  // MCP configuration for the agent
  mcpConfig?: McpExtensionConfig;

  // Overrides personnalisés pour les templates
  customArgs?: Record<string, unknown>;

  // Options de fusion des instructions avec template
  instructionsMode?: 'replace' | 'append' | 'prepend';
}

/**
 * DTO for updating existing agents
 */
export interface UpdateAgentDto {
  modelType?: ModelType;
  modelId?: ModelId;
  name?: string;
  description?: string;
  instructions?: string;
  contexts?: string[];
  contextArgs?: Record<string, AgentContextArgs>;
  status?: AgentStatus;
  maxSteps?: number;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  // MCP configuration updates
  mcpConfig?: McpExtensionConfig;
}

/**
 * Agent lifecycle events for monitoring and debugging
 */
export interface AgentLifecycleEvent {
  agentId: string;
  event: 'created' | 'started' | 'step' | 'completed' | 'error' | 'stopped';
  timestamp: number;
  data?: any;
  contextId?: string;
}
