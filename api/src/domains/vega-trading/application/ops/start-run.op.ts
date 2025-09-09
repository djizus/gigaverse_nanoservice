import { StartRunInput } from '../../vega-trading/validators/start-run.validation';
import { DatabaseService } from '../../../../infrastructure/database/database.service';
import { RunLogger } from '../../../../shared/logging/run-logger';
import { decideWithRetries } from '../../../../shared/agent/decide-with-retries';
import { RunFinalizer } from '../../../../shared/logging/run-finalizer';
import { TradingStateAdapter } from '../../../trading/adapters/trading.adapter';
import { TradingDataRegistry } from '../../../trading/trading.registry';
import { computeTaSummary } from '../../../trading/ta.utils';
import { DaydreamsAgentService } from '../../../../infrastructure/ai/daydreams.agent';
import { aiConfig } from '../../../../infrastructure/config/ai.config';

export async function startRunOp(
  db: DatabaseService,
  daydreamsAgent: DaydreamsAgentService | null | undefined,
  ports: { ensureAgent: () => Promise<string>; orchestrator: { ensureRunSession: (agentId: string, runId: string) => Promise<{ sessionId: string }> }; runRepo: { setRunMeta: (id: string, meta: Record<string, any>) => Promise<any> } },
  data: StartRunInput,
  meta: { developer: string; serviceId: string; version?: string }
) {
  const symbol = data.symbol.trim();
  const timeframes = ['15m','1h','4h','1d'] as const;
  const lookback = 60;
  const user_instructions = data.user_instructions || '';
  const modelId = data.llmModel || aiConfig.model;
  const source = (data.source || 'gmx').toLowerCase();

  const create = await db.createDungeonRun({
    player_address: `vega:${symbol}`,
    context: user_instructions || 'vega-trading',
    llm_model: modelId,
    total_runs: 1,
    dungeon_id: 0,
    is_juiced: false,
    consumables: [],
    gear_instance_ids: [],
  }, { serviceId: meta.serviceId, developer: meta.developer, meta: { symbol, timeframes } });
  if (!create.success || !create.data) throw new Error(create.error || 'Failed to create run');
  const runId = create.data.id;

  // Attach dedicated service agent + per-run session
  try {
    const agentId = await ports.ensureAgent();
    const session = await ports.orchestrator.ensureRunSession(agentId, runId);
    await ports.runRepo.setRunMeta(runId, { agentId, sessionId: session.sessionId });
  } catch {}

  const log = await db.createRunLog({ dungeon_run_id: runId, run_number: 1 });
  const runLogId = log.success && log.data ? log.data.id : null;
  const logger = new RunLogger(db, runId, runLogId);
  await logger.emit('run_started', `Signal request for ${symbol}`, { symbol, source, timeframes });

  try {
    const dataRegistry = new TradingDataRegistry();
    const adapter = dataRegistry.get(source);
    const results = await Promise.all(timeframes.map(async (tf) => {
      const snap = await adapter.fetchMarketSnapshot(symbol, tf, lookback);
      const ta = computeTaSummary(snap.ohlcv.map(d => ({ o: d.o, h: d.h, l: d.l, c: d.c })));
      return { timeframe: tf, snapshot: snap, ta };
    }));
    await logger.emit('context', 'Fetched market snapshots', { timeframes, asOf: results[0]?.snapshot?.asOf, summaries: results.map(r => ({ timeframe: r.timeframe, ta: r.ta })) });

    if (!daydreamsAgent || !daydreamsAgent.isEnabled) {
      await logger.emit('agent_error', 'Vega agent disabled or not configured', { reason: 'disabled_or_missing_key' });
      await db.updateDungeonRun(runId, { status: 'error' });
      return { runId, status: 'failed', message: 'Agent disabled' };
    }
    const stateAdapter = new TradingStateAdapter();
    const system = stateAdapter.buildSystem('signal', user_instructions);
    const buildPrompt = () => stateAdapter.composePrompt('signal', { multi: results, symbol });
    const res = await decideWithRetries({
      agent: daydreamsAgent,
      modelId,
      system,
      buildPrompt,
      parse: (t: string) => stateAdapter.parse('signal', t),
      success: (p: any) => stateAdapter.success('signal', p),
      logAttempt: async (attempt, max, parsed, raw) => logger.decisionAttempt('signal', attempt, max, parsed?.direction || 'invalid', { parsed, raw: (raw || '').slice(0, 400) }),
      logError: async (attempt, max, err) => logger.decisionError('signal', attempt, max, err),
      // Query once; NONE is an acceptable outcome to avoid redundant calls
      maxAttempts: 1,
    });

    const parsedOut = res?.parsed || { direction: 'NONE', raw: 'NONE' } as any;
    const reasonOut = typeof parsedOut.reason === 'string' && parsedOut.reason.trim().length > 0 ? parsedOut.reason.trim() : undefined;
    await logger.emit('trading_signal', `Signal: ${parsedOut.direction}${reasonOut ? ' - ' + reasonOut : ''}`, { signal: parsedOut, reason: reasonOut });
    const finalizer = new RunFinalizer(db, logger);
    await finalizer.completeSession(runId, { completedRuns: 1, totalRuns: 1 }, { emitRunCompleted: false });
    return { runId, status: 'completed', signal: parsedOut, reason: reasonOut };
  } catch (e: any) {
    await logger.emit('error', `Signal generation failed: ${e?.message || e}`);
    await db.updateDungeonRun(runId, { status: 'error' });
    return { runId, status: 'failed', message: e?.message || 'Failed to generate signal' };
  }
}
