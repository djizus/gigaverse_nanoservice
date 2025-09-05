export type AnthropicModelId =
  | 'claude-3-5-sonnet-latest'
  | 'claude-3-5-haiku-latest'
  | 'claude-3-opus-latest'
  | 'claude-3-7-sonnet-latest';
export type OpenAIModelId =
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gpt-4.1'
  | 'gpt-4.1-nano';
export type ModelType = 'anthropic' | 'openai';
export type ModelId = AnthropicModelId | OpenAIModelId;
