// src/config/env.validation.ts
import { z } from 'zod';

export const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_BOT_NAME: z.string().min(1),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL').optional(),
  SUPABASE_API_KEY: z.string().min(1).optional(),
  MEMORY_TYPE: z.string().optional().default('in-memory'),
  USE_CHROMA: z.string().optional(),
  CHROMA_URL: z.string().url('CHROMA_URL must be a valid URL').optional(),
  NOTION_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'staging', 'test', 'docker'])
    .optional()
    .default('development'),
  APP_NAME: z.string().optional().default('llm-api'),
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
