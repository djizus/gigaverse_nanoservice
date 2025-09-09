import { StartRunInput } from '../../loot-survivor/validators/start-run.validation';
import { DatabaseService } from '../../../../infrastructure/database/database.service';
import { RunLogger } from '../../../../shared/logging/run-logger';
import { RunFinalizer } from '../../../../shared/logging/run-finalizer';
import { GameStateService, GameStateConfig } from '../../../../services/loot-survivor/engine/GameStateService';
import { ContextEngine } from '../../../../services/loot-survivor/engine/ContextEngine';

export async function startRunOp(
  db: DatabaseService,
  cfg: GameStateConfig,
  ports: { ensureAgent?: () => Promise<string>; orchestrator?: { ensureRunSession: (agentId: string, runId: string) => Promise<{ sessionId: string }>; sendMessage: (agentId: string, sessionId: string, message: string, opts?: any) => Promise<{ text: string }> }; runRepo: { setRunMeta: (id: string, meta: Record<string, any>) => Promise<any> } },
  data: StartRunInput,
  meta: { developer: string; serviceId: string; version?: string }
) {
  const engine = new GameStateService(cfg);
  const ctxEngine = new ContextEngine();
  
  const llmModel = data.llmModel || 'google-vertex/gemini-2.5-flash';
  const user_instructions = data.user_instructions || '';

  const create = await db.createDungeonRun({
    player_address: `ls:${data.gameId}`,
    context: user_instructions || 'loot-survivor',
    llm_model: llmModel,
    total_runs: 1,
    dungeon_id: 0,
    is_juiced: false,
    consumables: [],
    gear_instance_ids: [],
  }, { serviceId: meta.serviceId, developer: meta.developer, meta: { gameId: data.gameId } });
  if (!create.success || !create.data) throw new Error(create.error || 'Failed to create run');
  const runId = create.data.id;
  const log = await db.createRunLog({ dungeon_run_id: runId, run_number: 1 });
  const runLogId = log.success && log.data ? log.data.id : null;
  const logger = new RunLogger(db, runId, runLogId);
  await logger.emit('run_started', `Loot Survivor read-only run for game ${data.gameId}`, { gameId: data.gameId });

  // Fetch state and build context
  let agentId: string | undefined;
  let sessionId: string | undefined;
  let agentResponse: string | undefined;
  let xpOut: number | undefined;
  try {
    const state = await engine.getGameState(data.gameId);
    xpOut = state?.adventurer?.xp;
    const ctx = ctxEngine.generateContext(state);
    const content = ctx.content;
    await logger.emit('context', 'Context snapshot', { xml: content.slice(0, 4000) });

    if (ports.ensureAgent && ports.orchestrator) {
      agentId = await ports.ensureAgent();
      const s = await ports.orchestrator.ensureRunSession(agentId, runId);
      sessionId = s.sessionId;
      const prompt = `You are the Loot Survivor agent. Analyze the following game state context and provide concise insights or recommended next actions.\n\n${content}\n\nUser instructions: ${user_instructions || 'Provide an objective assessment.'}`;
      const resp = await ports.orchestrator.sendMessage(agentId, sessionId, prompt, { temperature: 0.2 });
      agentResponse = resp.text;
      await ports.runRepo.setRunMeta(runId, { agentId, sessionId });
      await logger.emit('ls_agent_analysis', 'Agent analysis', { text: agentResponse?.slice(0, 1500) });
    }
  } catch (e: any) {
    await logger.emit('error', `Context or agent step failed: ${e?.message || e}`);
  }

  // Emit LS-specific completion event, then finalize without generic run_completed
  await logger.emit('run_completed', 'Loot Survivor analysis completed', { status: 'completed', gameId: data.gameId, xp: xpOut, analysis: (agentResponse || '').slice(0, 1500) });
  const finalizer = new RunFinalizer(db, logger);
  await finalizer.completeSession(runId, { completedRuns: 1, totalRuns: 1 }, { emitRunCompleted: false });
  return { runId, status: 'completed', agentId, sessionId, analysis: agentResponse };
}
