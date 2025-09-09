import { StartRunInput } from '../../gigaverse-dungeon/validators/start-run.validation';
import { DatabaseService } from '../../../../infrastructure/database/database.service';
import { DungeonService } from '../../../dungeon/dungeon.service';

export async function startRunOp(
  db: DatabaseService,
  dungeonService: DungeonService,
  ports: { ensureAgent: () => Promise<string>; orchestrator: { ensureRunSession: (agentId: string, runId: string) => Promise<{ sessionId: string }> }; runRepo: { setRunMeta: (id: string, meta: Record<string, any>) => Promise<any> } },
  data: StartRunInput,
  meta: { developer: string; serviceId: string; version?: string }
) {
  // Kick off run using existing DungeonService to preserve logic
  const res = await dungeonService.startDungeonRuns({
    user_instructions: data.user_instructions,
    playerAddress: data.playerAddress,
    gigaverseToken: data.gigaverseToken,
    totalRuns: data.totalRuns,
    dungeonId: data.dungeonId,
    isJuiced: data.isJuiced,
    consumables: data.consumables,
    gearInstanceIds: data.gearInstanceIds,
    llmModel: data.llmModel,
  }, { serviceId: meta.serviceId, developer: meta.developer, meta: { source: 'ns', version: meta.version } });

  // Attach orchestrator agent + session per run when available
  let agentId: string | undefined;
  let sessionId: string | undefined;
  try {
    if (res?.runId) {
      agentId = await ports.ensureAgent();
      const session = await ports.orchestrator.ensureRunSession(agentId, res.runId);
      sessionId = session.sessionId;
      await ports.runRepo.setRunMeta(res.runId, { agentId, sessionId });
    }
  } catch {}

  return agentId ? { ...res, agentId, sessionId } : res;
}
