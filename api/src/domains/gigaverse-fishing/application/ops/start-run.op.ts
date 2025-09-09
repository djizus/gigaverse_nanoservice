import { StartRunInput } from '../../gigaverse-fishing/validators/start-run.validation';
import { DatabaseService } from '../../../../infrastructure/database/database.service';
import { FishingService } from '../../../fishing/fishing.service';

export async function startRunOp(
  db: DatabaseService,
  fishingService: FishingService,
  ports: { ensureAgent: () => Promise<string>; orchestrator: { ensureRunSession: (agentId: string, runId: string) => Promise<{ sessionId: string }> }; runRepo: { setRunMeta: (id: string, meta: Record<string, any>) => Promise<any> } },
  data: StartRunInput,
  meta: { developer: string; serviceId: string; version?: string }
) {
  const res = await fishingService.startRuns({
    playerAddress: data.playerAddress,
    gigaverseToken: data.gigaverseToken,
    runType: data.runType,
    totalRuns: data.totalRuns,
    llmModel: data.llmModel,
    user_instructions: data.user_instructions,
  });

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
