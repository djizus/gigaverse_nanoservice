import { DatabaseService } from '../../infrastructure/database/database.service';
import { FishingStateAdapter } from '../gigaverse/adapters/fishing.adapter';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { logError } from '../../shared/utils/error.utils';
import { GigaverseGameClient } from '../gigaverse/gigaverse.client';
import { aiConfig } from '../../infrastructure/config/ai.config';
import { mapRunTypeToNodeId, computeProgress, clampSlot, isComplete } from '../gigaverse/gigaverse-fishing.utils';
import { buildStrategyContext, composeFishingPrompt, parseSlotFromText } from '../gigaverse/gigaverse-fishing.prompts';
import { RunLogger } from '../../shared/logging/run-logger';
import { RunFinalizer } from '../../shared/logging/run-finalizer';

export interface StartFishingRequest {
  playerAddress: string;
  gigaverseToken: string;
  runType: 'small' | 'normal' | 'big';
  totalRuns: number;
  llmModel?: string;
  user_instructions?: string;
}

export interface FishingRunResponse { runId: string; status: string; message: string; }

/**
 * Minimal Gigaverse Fishing orchestration.
 * MVP: create run records, log start events, and complete immediately.
 * Future: add active loop: getFishingCards → start_run → play_cards with LLM strategy.
 */
export class FishingService {
  private adapter = new FishingStateAdapter();
  constructor(private db: DatabaseService, private agent?: DaydreamsAgentService | null) {}

  async startRuns(req: StartFishingRequest): Promise<FishingRunResponse> {
    try {
      const create = await this.db.createDungeonRun({
        player_address: req.playerAddress,
        context: req.user_instructions || 'gigaverse-fishing',
        llm_model: req.llmModel || 'google-vertex/gemini-2.5-flash',
        total_runs: req.totalRuns,
        dungeon_id: 0,
        is_juiced: false,
        consumables: [],
        gear_instance_ids: [],
      }, { serviceId: 'gigaverse-fishing', developer: 'daydreams', meta: { runType: req.runType } });
      if (!create.success || !create.data) throw new Error(create.error || 'Failed to create run');
      const runId = create.data.id;

      // Prepare client
      const client = new GigaverseGameClient(req.gigaverseToken);
      const nodeId = mapRunTypeToNodeId(req.runType);

      let completed = 0;
      for (let i = 1; i <= req.totalRuns; i++) {
        const log = await this.db.createRunLog({ dungeon_run_id: runId, run_number: i });
        const runLogId = (log.success && log.data) ? log.data.id : null;
        const logger = new RunLogger(this.db, runId, runLogId);

        await logger.emit('run_started', `Fishing run ${i}/${req.totalRuns} started (${req.runType})`, { runType: req.runType });
        await logger.emit('fishing_started', 'Initialized fishing session', { runType: req.runType });

        // Determine if we should resume an existing upstream game
        let shouldResume = false;
        try {
          const st = await client.getFishingState(req.playerAddress);
          const gs: any = st?.gameState;
          const hand = (gs?.data?.hand) || gs?.hand || [];
          const complete = !!(gs?.doc?.COMPLETE_CID || gs?.COMPLETE_CID);
          if (Array.isArray(hand) && hand.length > 0 && !complete) shouldResume = true;
        } catch {}

        if (!shouldResume) {
          // Start run on upstream API
          try {
            const startRes = await client.startFishingAction({ action: 'start_run', actionToken: client.getActionToken() ?? '', data: { cards: [], nodeId } });
            if (!startRes?.success) {
              await logger.emit('error', `Upstream start_run failed: ${startRes?.message || 'unknown'}`);
              continue;
            }
            // Emit initial state snapshot if available
            const doc = (startRes as any)?.data?.doc;
            if (doc?.data) {
              const d = doc.data || {};
              const progress = computeProgress(d.fishHp, d.fishMaxHp);
              if (progress != null) await logger.emit('fishing_capture_progress', `Progress ${progress}%`, { fishHp: d.fishHp, fishMaxHp: d.fishMaxHp, progress });
            }
          } catch (e: any) {
            await logger.emit('error', `Start_run request error: ${e?.message || e}`);
            continue;
          }
        } else {
          await logger.emit('run_started', 'Resuming existing fishing game', { resumed: true });
          // Bootstrap actionToken if missing by issuing a no-op start_run (server will return token)
          try {
            if (!client.getActionToken()) {
              const boot = await client.startFishingAction({ action: 'start_run', actionToken: '', data: { cards: [], nodeId } });
              // Ignore success state; goal is to seed/refresh token
              await logger.emit('agent_decision_fishing', 'Bootstrapped token for resume', { ok: !!boot?.success });
            }
          } catch {}
        }

        // Loop: agent selects action, then execute until complete or step limit
        let step = 0;
        let complete = false;
        let stateDoc: any = null;
        const system = this.adapter.buildSystem('slot', req.user_instructions);
        while (step < 12 && !complete) {
          step++;
          // Fetch current state (best-effort) – after start_run first, then after each play
          try { const st = await client.getFishingState(req.playerAddress); stateDoc = st?.gameState || stateDoc; } catch {}

          // Default selection
          let chosenSlot = 1; // 1..hand.length
          let chosenCardId: number | null = null;
          try {
            const deck = await client.getFishingCards(req.playerAddress).catch(() => null);
            const hand: number[] = ((stateDoc?.data?.hand) || stateDoc?.hand || []) as number[];
            if (!Array.isArray(hand) || hand.length === 0) {
              await logger.emit('error', 'No cards in hand; cannot proceed', { step });
              break;
            }
            const fishPos = stateDoc?.data?.fishPosition || stateDoc?.fishPosition || [];
            const prevFish = stateDoc?.data?.previousFishPosition || stateDoc?.previousFishPosition || [];
            const modelId = req.llmModel || aiConfig.model;
            if (this.agent && this.agent.isEnabled) {
              const { decideWithRetries } = await import('../../shared/agent/decide-with-retries');
              const { RunLogger } = await import('../../shared/logging/run-logger');
              const logger = new RunLogger(this.db, runId, runLogId);
              const res = await decideWithRetries({
                agent: this.agent,
                modelId,
                system,
                buildPrompt: () => this.adapter.composePrompt('slot', { hand, deck, fishPos, prevFishPos: prevFish }),
                parse: (t: string) => parseSlotFromText(t, hand.length),
                success: (slot: number | null) => slot != null && Number.isFinite(slot),
                logAttempt: async (attempt, max, slot, raw) => {
                  const clamped = clampSlot(slot ?? 1, hand.length);
                  const cardId = hand[clamped - 1] ?? null;
                  await logger.decisionAttempt('slot', attempt, max, String(slot ?? 'invalid'), { attempt, slot, clamped, cardId, raw: (raw || '').slice(0, 200), step });
                },
                logError: async (attempt, max, err) => {
                  await logger.decisionError('slot', attempt, max, err, { step });
                },
                maxAttempts: 3,
              });
              if (res && res.parsed != null) chosenSlot = res.parsed as number;
            }
            chosenSlot = clampSlot(chosenSlot, hand.length);
            chosenCardId = hand[chosenSlot - 1] ?? null;
            await logger.emit('agent_decision_fishing', `Agent chose slot ${chosenSlot} (cardId=${chosenCardId})`, { slot: chosenSlot, cardId: chosenCardId, step });
          } catch (e: any) {
            await logger.emit('agent_decision_fishing', `Fallback slot 1`, { step, reason: 'agent_unavailable_or_error' });
          }

          try {
            if (chosenCardId == null) throw new Error('No valid card selected');
            // Upstream expects hand slot numbers (1-based), not card IDs
            if (!client.getActionToken()) {
              // Seed token right before play if still missing
              await client.startFishingAction({ action: 'start_run', actionToken: '', data: { cards: [], nodeId } }).catch(() => {});
              await new Promise(r => setTimeout(r, 150));
            }
            let play = await client.startFishingAction({ action: 'play_cards', actionToken: client.getActionToken() ?? '', data: { cards: [chosenSlot], nodeId: '' } });
            if (!play?.success) {
              // Retry once: token may be updated on error by client.makeRequest
              await new Promise(r => setTimeout(r, 150));
              play = await client.startFishingAction({ action: 'play_cards', actionToken: client.getActionToken() ?? '', data: { cards: [chosenSlot], nodeId: '' } });
            }
            const msg = play?.message || 'Played cards';
            const fishHp = (play as any)?.data?.doc?.data?.fishHp;
            const fishMaxHp = (play as any)?.data?.doc?.data?.fishMaxHp;
            const progress2 = computeProgress(fishHp, fishMaxHp);
            if (progress2 != null) await logger.emit('fishing_capture_progress', `Progress ${progress2}%`, { fishHp, fishMaxHp, progress: progress2, step });
            await logger.emit('fishing_cards', msg, { slot: chosenSlot, cardId: chosenCardId, ok: !!play?.success, step });
            const doc = (play as any)?.data?.doc;
            if (isComplete(doc)) complete = true;
            if (!play?.success) {
              // If still failing after retry, stop to avoid hammering
              await logger.emit('error', `play_cards failed after retry: ${play?.message || 'unknown'}`, { step });
              break;
            }
          } catch (e: any) {
            await logger.emit('error', `play_cards error: ${e?.message || e}`, { step });
            break;
          }
        }

        completed++;
      }

      const sessionLogger = new RunLogger(this.db, runId, null);
      const finalizer = new RunFinalizer(this.db, sessionLogger);
      await finalizer.completeSession(runId, { completedRuns: completed, totalRuns: req.totalRuns }, { emitRunCompleted: true });
      return { runId, status: 'completed', message: `Gigaverse fishing run completed (${req.runType})` };
    } catch (error: any) {
      logError({ operation: 'Start fishing runs', module: 'FishingService' }, error);
      return { runId: '', status: 'failed', message: error?.message || 'Failed to start fishing run' };
    }
  }
}
