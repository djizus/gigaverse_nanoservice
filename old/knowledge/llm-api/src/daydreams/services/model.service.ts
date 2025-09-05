import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageModelV1 } from '@daydreamsai/core';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { ModelType, ModelId } from '../types/models';

@Injectable()
export class ModelService {
  constructor(private configService: ConfigService) {}

  async initializeModel(
    modelType: ModelType,
    modelId: ModelId,
  ): Promise<LanguageModelV1> {
    try {
      if (modelType === 'anthropic') {
        console.log('[INFO] Initializing Anthropic model');
        const anthropicApiKey =
          this.configService?.get<string>('ANTHROPIC_API_KEY');

        if (!anthropicApiKey) {
          throw new Error('ANTHROPIC_API_KEY not set in environment');
        }

        const anthropic = createAnthropic({ apiKey: anthropicApiKey });
        return anthropic(modelId);
      } else if (modelType === 'openai') {
        console.log('[INFO] Initializing OpenAI model');
        const openaiApiKey = this.configService?.get<string>('OPENAI_API_KEY');

        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY not set in environment');
        }

        const openai = createOpenAI({ apiKey: openaiApiKey });
        return openai(modelId);
      } else {
        throw new Error(`Unsupported LLM provider: ${modelType}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize model:', error);
      throw error;
    }
  }
}
