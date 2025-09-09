import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';

export interface DecideWithRetriesOptions<T> {
  agent: DaydreamsAgentService;
  modelId: string;
  system: string;
  buildPrompt: () => string;
  parse: (text: string) => T;
  success: (parsed: T) => boolean;
  logAttempt: (attempt: number, max: number, parsed: T, raw: string) => Promise<void>;
  logError: (attempt: number, max: number, error: unknown) => Promise<void>;
  maxAttempts?: number;
}

export async function decideWithRetries<T>(opts: DecideWithRetriesOptions<T>): Promise<{ parsed: T; raw: string } | null> {
  const {
    agent,
    modelId,
    system,
    buildPrompt,
    parse,
    success,
    logAttempt,
    logError,
    maxAttempts = 3,
  } = opts;

  let lastParsed: T | undefined;
  let lastRaw = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prompt = buildPrompt();
      lastRaw = await agent.decideText(modelId, system, prompt);
      lastParsed = parse(lastRaw || '');
      await logAttempt(attempt, maxAttempts, lastParsed, lastRaw);
      if (success(lastParsed)) return { parsed: lastParsed, raw: lastRaw };
    } catch (e) {
      await logError(attempt, maxAttempts, e);
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 200));
  }
  return null;
}
