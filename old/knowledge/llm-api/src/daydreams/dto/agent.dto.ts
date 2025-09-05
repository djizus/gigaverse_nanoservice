import { ModelType, ModelId } from '../types/models';
import { AgentContextArgs } from '../types/agent';
import { McpExtensionConfig } from '../types/mcp';

/**
 * @deprecated Use CreateAgentDto from src/dto/agents instead
 * This DTO is kept for internal compatibility but should be migrated
 */
export class CreateAgentDto {
  id?: string;
  name?: string;
  modelType: ModelType;
  modelId: ModelId;
  contexts?: string[];
  instructions?: string;
  contextArgs?: Record<string, AgentContextArgs>;
  mcpConfig?: McpExtensionConfig;
  userId?: string;

  // Template-based creation properties
  templateId?: string;
  description?: string;
  customArgs?: Record<string, unknown>;
  maxSteps?: number;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  constructor(partial?: Partial<CreateAgentDto>) {
    if (partial) {
      Object.assign(this, partial);
      // Ensure modelType has a default value
      if (!this.modelType) {
        this.modelType = 'anthropic';
      }
      if (!this.modelId) {
        this.modelId =
          this.modelType === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4';
      }
    }
  }
}

export class CreateAgentFromTemplateDto {
  templateId: string;
  id?: string;
  modelType: ModelType;
  modelId: string;
  customArgs?: Record<string, unknown>;
}

export class CreateAgentWithTemplateDto {
  templateId: string;
  variables?: Record<string, string>;
  id?: string;
  name?: string;
  description?: string;
  instructions?: string;
  modelType: ModelType;
  modelId: string;
}
