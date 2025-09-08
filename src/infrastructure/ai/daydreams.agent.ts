import { z } from 'zod';
import { generateObject, generateText, streamText } from 'ai';
import { createDreamsRouter } from '@daydreamsai/ai-sdk-provider';
import { aiConfig } from '../config/ai.config';
import type { AgentConfig } from '../../daydreams/types/agent';
import {
  createDreams,
  LogLevel,
  Agent,
  AnyContext,
  BaseMemory,
} from '@daydreamsai/core';

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
  private runtimes: Map<string, Agent> = new Map();
  private agents: Map<string, AgentConfig> = new Map();

  constructor() {}

  async initialize(): Promise<void> {
    if (!aiConfig.enabled) return;
    if (aiConfig.apiKey) {
      try {
        this.modelProvider = createDreamsRouter({ apiKey: aiConfig.apiKey });
        console.log('[DaydreamsAgentService] Initialized Daydreams router with API key');
      } catch (err) {
        console.warn('[DaydreamsAgentService] Failed to initialize router with API key:', err);
        this.modelProvider = null;
      }
    } else {
      console.warn('[DaydreamsAgentService] No DREAMS_ROUTER_API_KEY provided; router not initialized');
      this.modelProvider = null;
    }
  }

  get isEnabled(): boolean {
    return !!(aiConfig.enabled && (this.modelProvider || this.runtimes.size > 0));
  }

  // Generic text generation for non-Gigaverse agents (uses runtime if available)
  async generateTextForAgent(agent: Pick<AgentConfig, 'id' | 'model' | 'name' | 'context' | 'instructions'>, opts: {
    prompt: string;
    system?: string;
    temperature?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (!this.isEnabled || !this.modelProvider) {
      throw new Error('Daydreams agent is not enabled or API key missing');
    }
    const rt = this.runtimes.get((agent as any).id as string);
    if (rt) {
      return rt.send({ input: opts.prompt, temperature: opts.temperature, signal: opts.signal });
    }
    const system = opts.system || agent.instructions || `You are ${agent.name}, a helpful assistant for context '${agent.context}'.`;
    const modelId = aiConfig.model; // enforce configured model
    if (agent.model && agent.model !== modelId) {
      console.warn(`[DaydreamsAgentService] generateTextForAgent: overriding agent.model='${agent.model}' -> '${modelId}'`);
    }
    try {
      const { text } = await generateText({ model: this.modelProvider(modelId), system, prompt: opts.prompt, temperature: opts.temperature ?? 0.2, signal: opts.signal });
      return text;
    } catch (err: any) {
      console.error('[DaydreamsAgentService] generateTextForAgent error', {
        name: err?.name,
        message: err?.message,
        url: err?.url,
        statusCode: err?.statusCode,
        requestBodyValues: err?.requestBodyValues,
        responseBody: err?.responseBody,
      });
      if (err?.stack) console.error(err.stack);
      throw err;
    }
  }

  // Streaming text generation (SSE-friendly)
  async streamTextForAgent(agent: Pick<AgentConfig, 'id' | 'model' | 'name' | 'context' | 'instructions'>, opts: {
    prompt: string;
    system?: string;
    temperature?: number;
    signal?: AbortSignal;
  }): Promise<{ textStream: AsyncIterable<string> }> {
    if (!this.isEnabled || !this.modelProvider) {
      throw new Error('Daydreams agent is not enabled or API key missing');
    }
    const rt = this.runtimes.get(agent.id as string);
    if (rt) {
      const response = await rt.send({
        context: agent.context,
        args: request.args,
        input: request.input,
      });
      return { response };
    }
    const system = opts.system || agent.instructions || `You are ${agent.name}, a helpful assistant for context '${agent.context}'.`;
    const modelId = aiConfig.model; // enforce configured model
    if (agent.model && agent.model !== modelId) {
      console.warn(`[DaydreamsAgentService] streamTextForAgent: overriding agent.model='${agent.model}' -> '${modelId}'`);
    }
    try {
      const result = await streamText({ model: this.modelProvider(modelId), system, prompt: opts.prompt, temperature: opts.temperature ?? 0.2, signal: opts.signal });
      return { textStream: result.textStream };
    } catch (err: any) {
      console.error('[DaydreamsAgentService] streamTextForAgent error', {
        name: err?.name,
        message: err?.message,
        url: err?.url,
        statusCode: err?.statusCode,
        requestBodyValues: err?.requestBodyValues,
        responseBody: err?.responseBody,
      });
      if (err?.stack) console.error(err.stack);
      throw err;
    }
  }

  // Runtime registry — link DB agent to an in-memory runtime profile
  registerAgent(agent: Pick<AgentConfig, 'id' | 'model' | 'name' | 'context' | 'instructions'>) {
    if (!this.modelProvider) return;
    const system = agent.instructions || `You are ${agent.name}, a helpful assistant for context '${agent.context}'.`;
    const modelId = aiConfig.model; // enforce configured model
    if (agent.model && agent.model !== modelId) {
      console.warn(`[DaydreamsAgentService] registerAgent: overriding agent.model='${agent.model}' -> '${modelId}'`);
    }

    const runtime = createDreams({
      model: this.modelProvider(modelId),
      // Minimal runtime for now; contexts/memory/actions can be wired later
      contexts: [],
      inputs: {},
      outputs: {},
      extensions: [],
      logLevel: LogLevel.INFO,
    });
    this.runtimes.set(agent.id, runtime);
    // Track the agent metadata in the registry as well
    this.agents.set(agent.id, {
      id: agent.id,
      name: agent.name,
      model: agent.model || aiConfig.model,
      context: agent.context,
      instructions: agent.instructions,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AgentConfig);
  }

  unregisterAgent(agentId: string) {
    this.runtimes.delete(agentId);
    this.agents.delete(agentId);
  }

  hasRuntime(agentId: string): boolean {
    return this.runtimes.has(agentId);
  }

  getRuntime(agentId: string): any | undefined {
    return this.runtimes.get(agentId);
  }

  // Runtime-only helpers (throws if runtime missing)
  async send(agentId: string, input: string, opts?: { temperature?: number; signal?: AbortSignal }) {
    const rt = this.getRuntime(agentId);
    if (!rt) {
      const err: any = new Error(`Runtime not registered for agent ${agentId}`);
      err.statusCode = 404;
      err.code = 'RuntimeNotFound';
      throw err;
    }
    return rt.send({ input, temperature: opts?.temperature, signal: opts?.signal });
  }

  async stream(agentId: string, input: string, opts?: { temperature?: number; signal?: AbortSignal }): Promise<AsyncIterable<string>> {
    const rt: any = this.getRuntime(agentId);
    if (!rt) {
      const err: any = new Error(`Runtime not registered for agent ${agentId}`);
      err.statusCode = 404;
      err.code = 'RuntimeNotFound';
      throw err;
    }
    if (typeof rt.stream === 'function') {
      return rt.stream({ input, temperature: opts?.temperature, signal: opts?.signal });
    }
    if (!this.modelProvider) {
      const err: any = new Error('Router not initialized');
      err.statusCode = 402;
      err.code = 'PaymentRequired';
      throw err;
    }
    const agent = this.agents.get(agentId);
    const system = agent?.instructions || '';
  rt.stream({ input, temperature: opts?.temperature, signal: opts?.signal });
    return result.textStream;
  }

  // Register runtime using per-agent API key (does not rely on global provider)
  registerAgentWithApiKey(agent: Pick<AgentConfig, 'id' | 'name' | 'context' | 'instructions'>, apiKey: string) {
    const system = agent.instructions || `You are ${agent.name}, a helpful assistant for context '${agent.context}'.`;
    const provider = createDreamsRouter({ apiKey });
    const runtime = createDreams({
      model: provider(aiConfig.model),
      contexts: [],
      inputs: {},
      outputs: {},
      extensions: [],
      logLevel: LogLevel.INFO,
    });
    this.runtimes.set(agent.id, runtime);
    this.agents.set(agent.id, {
      id: agent.id,
      name: agent.name,
      model: aiConfig.model,
      context: agent.context,
      instructions: agent.instructions,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AgentConfig);
  }

  getRegisteredAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  listRegisteredAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
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
