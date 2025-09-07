import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { GameStateService, GameStateConfig } from './engine/GameStateService';
import { ContextEngine } from './engine/ContextEngine';

export class LootSurvivorServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private engine: GameStateService;
  private contextEngine: ContextEngine;

  constructor(opts: { developer?: string; database: DatabaseService; config?: Partial<GameStateConfig> }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = {
      developer,
      serviceId: 'loot-survivor',
      name: 'Loot Survivor Context Service',
      version: '0.1.0',
      summary: 'Read-only context and decision logging for Loot Survivor',
      capabilities: ['runOrchestrator', 'contextProvider'],
      uiSchema: {
        fields: [
          { id: 'gameId', label: 'Game ID', type: 'number', required: true },
          { id: 'llmModel', label: 'Model (optional)', type: 'text' },
        ]
      }
    };
    const cfg: GameStateConfig = {
      toriiUrl: opts.config?.toriiUrl || process.env.TORII_URL || 'https://api.cartridge.gg/x/pg-sepolia/torii',
      namespace: opts.config?.namespace || process.env.NAMESPACE || 'ls_0_0_6',
    };
    this.db = opts.database;
    this.engine = new GameStateService(cfg);
    this.contextEngine = new ContextEngine();
  }

  async init() {}
  async health() { return { ok: true }; }

  async call(op: string, data: any) {
    switch (op) {
      case 'context': {
        const gameId = Number(data?.gameId);
        if (!gameId) throw new Error('gameId required');
        const state = await this.engine.getGameState(gameId);
        const ctx = this.contextEngine.generateContext(state);
        const inline = ctx.content.replace(/\n\s*/g, '');
        return { content: inline, tokens: ctx.tokens };
      }
      case 'startRun': {
        // Read-only: create a run and log context snapshot, then complete
        const gameId = Number(data?.gameId);
        if (!gameId) throw new Error('gameId required');
        const llmModel = data?.llmModel || 'google-vertex/gemini-2.5-flash';
        const create = await this.db.createDungeonRun({
          player_address: `ls:${gameId}`,
          context: 'loot-survivor',
          llm_model: llmModel,
          total_runs: 1,
          dungeon_id: 0,
          is_juiced: false,
          consumables: [],
          gear_instance_ids: [],
        }, { serviceId: 'loot-survivor', developer: this.manifest.developer, meta: { gameId } });
        if (!create.success || !create.data) throw new Error(create.error || 'Failed to create run');
        const runId = create.data.id;
        const log = await this.db.createRunLog({ dungeon_run_id: runId, run_number: 1 });
        const runLogId = log.success && log.data ? log.data.id : null;
        await this.db.logEvent(runId, runLogId || '0', 'run_started', `Loot Survivor read-only run for game ${gameId}`, { gameId });
        try {
          const state = await this.engine.getGameState(gameId);
          const ctx = this.contextEngine.generateContext(state);
          await this.db.createRunEvent({ dungeon_run_id: runId, run_log_id: runLogId, event_type: 'loot_phase', message: 'Context snapshot', event_data: { xml: ctx.content.slice(0, 4000) } });
        } catch (e: any) {
          await this.db.createRunEvent({ dungeon_run_id: runId, run_log_id: runLogId, event_type: 'error', message: `Context fetch failed: ${e?.message || e}` });
        }
        await this.db.updateDungeonRun(runId, { completed_at: new Date().toISOString(), completed_runs: 1, status: 'completed' });
        await this.db.createRunEvent({ dungeon_run_id: runId, run_log_id: runLogId, event_type: 'run_completed', message: 'Read-only run completed', event_data: { status: 'completed' } });
        return { runId, status: 'completed', message: `LS read-only run completed for game ${gameId}` };
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}

