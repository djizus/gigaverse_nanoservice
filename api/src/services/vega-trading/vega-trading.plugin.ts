import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { RunLogger } from '../../shared/logging/run-logger';
import { decideWithRetries } from '../../shared/agent/decide-with-retries';
import { TradingStateAdapter } from '../../domains/trading/adapters/trading.adapter';
import { TradingDataRegistry } from '../../domains/trading/trading.registry';
import { computeTaSummary } from '../../domains/trading/ta.utils';
import { aiConfig } from '../../infrastructure/config/ai.config';

export class VegaTradingServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private agent?: DaydreamsAgentService | null;
  private adapter = new TradingStateAdapter();
  private dataRegistry = new TradingDataRegistry();

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService | null }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = {
      developer,
      serviceId: 'vega-trading',
      name: 'Vega Trading Signals',
      version: '0.1.0',
      summary: 'Fetches market data and asks Vega for trading signals',
      capabilities: ['signalProvider', 'runOrchestrator'],
      uiSchema: {
        fields: [
          { id: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: 'e.g., BTC-USD' },
          { id: 'source', label: 'Data Source', type: 'select', required: false, options: ['gmx','hyperliquid'], default: 'gmx' },
          { id: 'llmModel', label: 'Model', type: 'text', required: false, default: aiConfig.model },
          { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: false, default: 'Be conservative. Only signal when confidence > 60%.' },
        ]
      }
    };
    this.db = opts.database;
    this.agent = opts.agent;
  }

  async init() {}
  async health() { return { ok: true }; }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        // TODO[orchestrator-mapping]:
        // - Create/ensure a "Vega Trading Orchestrator" agent for signal runs
        // - Ensure a session and persist { agentId, sessionId } into run.meta via DatabaseService
        // - Surface mapping in the HTTP response for UI auto-linking
        const symbol = String(data?.symbol || '').trim();
        if (!symbol) throw new Error('symbol required');
        const timeframes = ['15m','1h','4h','1d'] as const;
        const lookback = 60; // internal default depth for TA and context
        const user_instructions = String(data?.user_instructions || '');
        const modelId = data?.llmModel || aiConfig.model;
        const source = (data?.source || 'gmx').toLowerCase();

        // Create run
        const create = await this.db.createDungeonRun({
          player_address: `vega:${symbol}`,
          context: user_instructions || 'vega-trading',
          llm_model: modelId,
          total_runs: 1,
          dungeon_id: 0,
          is_juiced: false,
          consumables: [],
          gear_instance_ids: [],
        }, { serviceId: this.manifest.serviceId, developer: this.manifest.developer, meta: { symbol, timeframes } });
        if (!create.success || !create.data) throw new Error(create.error || 'Failed to create run');
        const runId = create.data.id;
        const log = await this.db.createRunLog({ dungeon_run_id: runId, run_number: 1 });
        const runLogId = log.success && log.data ? log.data.id : null;
        const logger = new RunLogger(this.db, runId, runLogId);
        await logger.emit('run_started', `Signal request for ${symbol}`, { symbol, source, timeframes });

        try {
          // Fetch snapshot
          const adapter = this.dataRegistry.get(source);
          // Fetch multiple timeframes in parallel
          const results = await Promise.all(timeframes.map(async (tf) => {
            const snap = await adapter.fetchMarketSnapshot(symbol, tf, lookback);
            const ta = computeTaSummary(snap.ohlcv.map(d => ({ o: d.o, h: d.h, l: d.l, c: d.c })));
            return { timeframe: tf, snapshot: snap, ta };
          }));
          await logger.emit('context', 'Fetched market snapshots', { timeframes, asOf: results[0]?.snapshot?.asOf, summaries: results.map(r => ({ timeframe: r.timeframe, ta: r.ta })) });

          // Agent decision
          if (!this.agent || !this.agent.isEnabled) {
            await logger.emit('agent_error', 'Vega agent disabled or not configured', { reason: 'disabled_or_missing_key' });
            await this.db.updateDungeonRun(runId, { status: 'error' });
            return { runId, status: 'failed', message: 'Agent disabled' };
          }
          const system = this.adapter.buildSystem('signal', user_instructions);
          const buildPrompt = () => this.adapter.composePrompt('signal', { multi: results, symbol });
          const res = await decideWithRetries({
            agent: this.agent,
            modelId,
            system,
            buildPrompt,
            parse: (t: string) => this.adapter.parse('signal', t),
            success: (p: any) => this.adapter.success('signal', p),
            logAttempt: async (attempt, max, parsed, raw) => logger.decisionAttempt('signal', attempt, max, parsed?.direction || 'invalid', { parsed, raw: (raw || '').slice(0, 400) }),
            logError: async (attempt, max, err) => logger.decisionError('signal', attempt, max, err),
            maxAttempts: 2,
          });

          const parsed = res?.parsed || { direction: 'NONE', raw: '' };
          await logger.emit('run_completed', `Signal: ${parsed.direction}`, { signal: parsed });
          await this.db.updateDungeonRun(runId, { status: 'completed', completed_at: new Date().toISOString(), completed_runs: 1 });
          return { runId, status: 'completed', signal: parsed };
        } catch (e: any) {
          await logger.emit('error', `Signal generation failed: ${e?.message || e}`);
          await this.db.updateDungeonRun(runId, { status: 'error' });
          return { runId, status: 'failed', message: e?.message || 'Failed to generate signal' };
        }
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
