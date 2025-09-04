import { z } from 'zod';
import { generateObject } from 'ai';
import { createDreamsRouter } from '@daydreamsai/ai-sdk-provider';
import { aiConfig } from '../config/ai.config';

type MoveName = 'rock' | 'paper' | 'scissor';
type LootChoice = 'loot_one' | 'loot_two' | 'loot_three' | 'loot_four';

const MoveDecisionSchema = z.object({
  move: z.enum(['rock', 'paper', 'scissor']),
  reason: z.string().min(1).max(280),
});

const LootDecisionSchema = z.object({
  loot: z.enum(['loot_one', 'loot_two', 'loot_three', 'loot_four']),
  reason: z.string().min(1).max(280),
});

export interface RoomDecisionHistoryItem {
  kind: 'move' | 'loot';
  choice: string; // move or loot key
  reason: string;
}

export interface MoveInput {
  context: string;
  state: any; // Compact GigaverseDungeonState subset
  roomDecisionHistory: RoomDecisionHistoryItem[];
}

export interface LootInput {
  context: string;
  options: any[]; // lootOptions subset
  player: any; // player subset
  roomDecisionHistory: RoomDecisionHistoryItem[];
}

export class DaydreamsAgentService {
  private modelProvider: ReturnType<typeof createDreamsRouter> | null = null;

  constructor() {
    if (aiConfig.enabled && aiConfig.apiKey) {
      this.modelProvider = createDreamsRouter({ apiKey: aiConfig.apiKey });
    }
  }

  get isEnabled(): boolean {
    return !!(aiConfig.enabled && aiConfig.apiKey && this.modelProvider);
  }

  private withTimeout<T>(signal: AbortSignal, timeoutMs: number): AbortSignal {
    // ai.generateObject supports AbortSignal via options.signal
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // If upstream signal aborts, propagate
    signal.addEventListener('abort', () => controller.abort(), { once: true });
    // Return the controller's signal; caller should clear timer by catching abort or completion
    return controller.signal;
  }

  async suggestMove(input: MoveInput, baseSignal?: AbortSignal): Promise<z.infer<typeof MoveDecisionSchema>> {
    if (!this.isEnabled || !this.modelProvider) {
      throw new Error('Daydreams agent is not enabled or API key missing');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.timeoutMs);
    if (baseSignal) baseSignal.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      const { object } = await generateObject({
        model: this.modelProvider(aiConfig.model),
        schema: MoveDecisionSchema,
        mode: 'json',
        system: [
          'You are a tactical assistant for a turn-based dungeon game.',
          'Decide the best single move right now. Return valid JSON only.',
          'Consider player/enemy HP, shields, move charges, last moves, and the provided context.',
          'Use roomDecisionHistory to stay consistent within the same room. Ignore history from prior rooms.',
          'Do not include explanations outside the JSON fields. Be concise in reason.',
        ].join(' '),
        prompt: [
          'Context:', JSON.stringify(input.context),
          'State:', JSON.stringify(input.state),
          'RoomDecisionHistory:', JSON.stringify(input.roomDecisionHistory || []),
        ].join('\n'),
        signal: controller.signal,
        temperature: 0,
      });
      return object;
    } finally {
      clearTimeout(timeout);
    }
  }

  async suggestLoot(input: LootInput, baseSignal?: AbortSignal): Promise<z.infer<typeof LootDecisionSchema>> {
    if (!this.isEnabled || !this.modelProvider) {
      throw new Error('Daydreams agent is not enabled or API key missing');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.timeoutMs);
    if (baseSignal) baseSignal.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      const { object } = await generateObject({
        model: this.modelProvider(aiConfig.model),
        schema: LootDecisionSchema,
        mode: 'json',
        system: [
          'You are a tactical assistant for a dungeon game.',
          'Select the best single loot option right now. Return valid JSON only.',
          'Consider player HP/shield/moves, loot boon types/rarity, and the provided context.',
          'Use roomDecisionHistory to stay consistent within the same room. Ignore history from prior rooms.',
          'Do not include explanations outside the JSON fields. Be concise in reason.',
        ].join(' '),
        prompt: [
          'Context:', JSON.stringify(input.context),
          'Player:', JSON.stringify(input.player),
          'Options:', JSON.stringify(input.options),
          'RoomDecisionHistory:', JSON.stringify(input.roomDecisionHistory || []),
        ].join('\n'),
        signal: controller.signal,
        temperature: 0,
      });
      return object;
    } finally {
      clearTimeout(timeout);
    }
  }
}

