export interface AiConfig {
  enabled: boolean;
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
}

export const aiConfig: AiConfig = {
  // Always consider agent feature enabled; runtime requires API key
  enabled: true,
  apiKey: process.env.DREAMS_ROUTER_API_KEY,
  // Default model; UI can override per request/agent
  model: 'google-vertex/gemini-2.5-flash',
  // Fixed timeout (ms), not env-driven
  timeoutMs: 8000,
};
