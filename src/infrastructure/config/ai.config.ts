import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface AiConfig {
  enabled: boolean;
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
}

export const aiConfig: AiConfig = {
  enabled: process.env.USE_DAYDREAMS_AGENT === 'true',
  apiKey: process.env.DREAMS_ROUTER_API_KEY,
  model: process.env.DAYDREAMS_MODEL || 'google-vertex/gemini-2.5-flash',
  timeoutMs: Number(process.env.DAYDREAMS_TIMEOUT_MS || 2000),
};

