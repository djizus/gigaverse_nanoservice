import { 
  DungeonRequest, 
  DungeonRunResponse,
  GigaverseDungeonState 
} from './dungeon.types';
import { GigaverseGameClient } from '../gigaverse/gigaverse.client';
import { 
  parseDungeonState,
  formatError,
  sleep,
  formatBattleSummary,
  computeStageRoom
} from '../gigaverse/gigaverse.utils';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { logError, logSuccess, throwError, formatError as formatErrorMessage } from '../../shared/utils/error.utils';
import { CreateDungeonRunInput } from '../../infrastructure/database/types';
import { DaydreamsAgentService, RoomDecisionHistoryItem } from '../../infrastructure/ai/daydreams.agent';
import { aiConfig } from '../../infrastructure/config/ai.config';

const ACTION_DELAY_MS = 100; // Small delay to avoid hammering APIs

export class DungeonService {
  private agent: DaydreamsAgentService | null;

  constructor(private databaseService: DatabaseService, agent?: DaydreamsAgentService | null) {
    // Now depends on database service for real-time logging
    this.agent = agent || null;
  }

  async initialize(): Promise<void> {
    console.log("🏰 Real-time dungeon service initialized");
  }

  /**
   * Start dungeon runs and return immediately with runId
   * Processing happens in the background with real-time event logging
   */
  async startDungeonRuns(request: DungeonRequest): Promise<DungeonRunResponse> {
    try {
      // Check for existing active runs first
      const activeRunResult = await this.databaseService.getActiveRunForPlayer(
        request.playerAddress
      );

      if (activeRunResult.success && activeRunResult.data) {
        const existingRun = activeRunResult.data;
        logSuccess('DungeonService', 'Found existing active run', { 
          runId: existingRun.id,
          status: existingRun.status,
          progress: `${existingRun.completed_runs}/${existingRun.total_runs}`
        });
        
        // Return the existing run without charging again
        return {
          runId: existingRun.id,
          status: 'existing',
          message: `Active dungeon run already in progress! ${existingRun.completed_runs}/${existingRun.total_runs} runs completed. Subscribe to runId: ${existingRun.id}`
        };
      }

      // No active run found, create a new one
      const dungeonRunInput: CreateDungeonRunInput = {
        player_address: request.playerAddress,
        context: request.context,
        llm_model: request.llmModel || undefined,
        meta: { source: 'api', version: 'v1' },
        total_runs: request.totalRuns,
        dungeon_id: request.dungeonId,
        is_juiced: request.isJuiced || false,
        consumables: request.consumables || [],
        gear_instance_ids: request.gearInstanceIds || []
      };
      
      const createResult = await this.databaseService.createDungeonRun(dungeonRunInput);
      
      if (!createResult.success || !createResult.data) {
        throwError(
          { operation: 'Create dungeon run', module: 'DungeonService' },
          createResult.error || 'Unknown database error'
        );
      }
      
      const dungeonRun = createResult.data;
      const runId = dungeonRun.id;
      
      console.log(`🏰 Created dungeon run ${runId} for player ${request.playerAddress}`);
      console.log(`🎮 Dungeon ${request.dungeonId} | Runs: ${request.totalRuns} | Juiced: ${request.isJuiced}`);
      
      // Start background processing (don't await)
      this.processDungeonRunsInBackground(runId, request).catch(error => {
        logError({ operation: 'Background processing', module: 'DungeonService', details: { runId } }, error);
        this.databaseService.failDungeonRun(runId, formatErrorMessage(error));
      });
      
      // Return immediately
      return {
        runId,
        status: 'started',
        message: `Dungeon run started! Subscribe to real-time updates for runId: ${runId}`
      };
      
    } catch (error) {
      console.error('🚨 Failed to start dungeon runs:', error);
      return {
        runId: '',
        status: 'failed',
        message: `Failed to start dungeon runs: ${formatError(error)}`
      };
    }
  }

  /**
   * Background processing of dungeon runs with real-time event logging
   */
  private async processDungeonRunsInBackground(dungeonRunId: string, request: DungeonRequest): Promise<void> {
    const { 
      context,
      playerAddress, 
      gigaverseToken,
      totalRuns,
      dungeonId, 
      isJuiced = false,
      consumables = [],
      gearInstanceIds = []
    } = request;

    console.log(`🔄 Starting background processing for ${dungeonRunId}`);

    // Update status to processing
    await this.databaseService.updateDungeonRun(dungeonRunId, { status: 'processing' });

    let completedRuns = 0;
    
    try {
      // Initialize single Gigaverse client for all runs to maintain token state  
      const gameClient = new GigaverseGameClient(gigaverseToken);
      console.log(`[TokenDebug] Client initialized - initial token: ${gameClient.getActionToken()}`);
      
      // Execute all requested runs
      let aborted = false;
      let successfulRuns = 0;
      for (let runNumber = 1; runNumber <= totalRuns; runNumber++) {
        console.log(`\n🗡️ Processing run ${runNumber}/${totalRuns}...`);
        console.log(`[TokenDebug] Starting run ${runNumber} - initial token: ${gameClient.getActionToken()}`);
        
        // Create run log in database
        const runLogResult = await this.databaseService.createRunLog({
          dungeon_run_id: dungeonRunId,
          run_number: runNumber
        });

        if (!runLogResult.success || !runLogResult.data) {
          throw new Error(`Failed to create run log: ${runLogResult.error}`);
        }

        const runLog = runLogResult.data;
        
        // Log run started event
        await this.databaseService.logEvent(
          dungeonRunId,
          runLog.id,
          'run_started',
          `Starting dungeon run ${runNumber}/${totalRuns}`,
          { runNumber, dungeonId, isJuiced }
        );

        const success = await this.executeSingleDungeonRun(
          dungeonRunId,
          runLog,
          gameClient,
          context,
          {
            runNumber,
            dungeonId,
            playerAddress,
            isJuiced,
            consumables,
            gearInstanceIds,
            llmModel: request.llmModel
          }
        );
        
        if (success) {
          completedRuns++;
          // Determine success: reaching Stage 4-4 with HP left
          try {
            const srDone = computeStageRoom(dungeonState.currentRoom);
            const hp = dungeonState.player?.health?.current ?? 0;
            if (dungeonState.isComplete && srDone.stage === 4 && srDone.room === 4 && hp > 0) {
              successfulRuns++;
            }
          } catch {}
        } else {
          // Execution failed (agent error or other). Abort remaining runs.
          aborted = true;
          console.log(`⛔ Aborting remaining runs after failure at run ${runNumber}/${totalRuns}`);
          break;
        }
        
        // No between-runs delay to maximize throughput
      }

      if (!aborted) {
        // Mark as completed
        await this.databaseService.completeDungeonRun(dungeonRunId, completedRuns);

        // Log completion event (session-level, no specific run log)
        await this.databaseService.createRunEvent({
          dungeon_run_id: dungeonRunId,
          run_log_id: null, // null for session-level events
          event_type: 'all_runs_completed',
          message: `All dungeon runs completed! ${completedRuns}/${totalRuns} successful`,
          event_data: { completedRuns, totalRuns, successfulRuns, successRate: (successfulRuns / totalRuns) * 100 }
        });

        console.log(`✅ Completed all runs for ${dungeonRunId}: ${completedRuns}/${totalRuns} successful`);
      } else {
        console.log(`❌ Dungeon run ${dungeonRunId} aborted after failure; not marking as completed.`);
      }
      
    } catch (error) {
      logError({ operation: 'Background processing', module: 'DungeonService', details: { dungeonRunId } }, error);
      await this.databaseService.abortDungeonRun(dungeonRunId, formatErrorMessage(error));
    }
  }
  
  /**
   * Execute a single dungeon run with real-time event logging
   */
  private async executeSingleDungeonRun(
    dungeonRunId: string,
    runLog: any,
    gameClient: GigaverseGameClient,
    context: string,
    params: {
      runNumber: number;
      dungeonId: number;
      playerAddress: string;
      isJuiced: boolean;
      consumables: any[];
      gearInstanceIds: string[];
      llmModel?: string;
    }
  ): Promise<boolean> {
    const { runNumber, dungeonId, playerAddress, isJuiced, consumables, gearInstanceIds, llmModel } = params;
    
    let roomsCleared = 0;
    let battlesWon = 0;
    let battlesLost = 0;
    let itemsGained = 0;
    const statsTally: Record<string, number> = {};
    const moves: string[] = [];
    const lootChoices: string[] = [];

    try {
      // Step 1: Check for existing run or start new one
      console.log(`🔍 Checking player status for run ${runNumber}...`);
      
      const initResult = await this.checkAndInitializeDungeon(
        dungeonRunId,
        runLog.id,
        gameClient,
        dungeonId,
        isJuiced,
        consumables,
        gearInstanceIds
      );
      
      if (!initResult.dungeonState) {
        throw new Error('Failed to initialize dungeon state');
      }
      
      let dungeonState = initResult.dungeonState;
      
      // Track initial HP
      const startHP = dungeonState.player?.health?.current || 0;
      const maxHP = dungeonState.player?.health?.currentMax || 100;

      // Step 2: Main dungeon loop - fight, loot, or complete
      // Track per-room decision memory
      let currentRoomNumber = dungeonState.currentRoom;
      let roomDecisionHistory: RoomDecisionHistoryItem[] = [];

      while (!dungeonState.isComplete && dungeonState.player?.health?.current > 0) {
        // Reset room memory if room changed
        if (dungeonState.currentRoom !== currentRoomNumber) {
          currentRoomNumber = dungeonState.currentRoom;
          roomDecisionHistory = [];
        }
        
        if (dungeonState.lootPhase && dungeonState.lootOptions.length > 0) {
          const { sanitizeStateForLLM } = await import('../gigaverse/gigaverse.prompts');
          const statePreview = sanitizeStateForLLM({
            currentDungeon: dungeonState.currentDungeon,
            currentRoom: dungeonState.currentRoom,
            currentEnemy: dungeonState.currentEnemy,
            lootPhase: dungeonState.lootPhase,
            lastBattleResult: dungeonState.lastBattleResult,
            player: dungeonState.player,
            enemy: dungeonState.enemy,
          });
          // Loot phase - enriched logging with stage/room
          const srLoot = computeStageRoom(dungeonState.currentRoom);
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'loot_phase',
            `Loot phase (stage ${srLoot.stage}-${srLoot.room}): ${dungeonState.lootOptions.length} options available`,
            { lootOptions: dungeonState.lootOptions, state: statePreview, stage: srLoot.stage, roomInStage: srLoot.room, absRoom: dungeonState.currentRoom }
          );
          
          // Agent-only decision for loot
          if (!this.agent || !this.agent.isEnabled) {
            const msg = 'Daydreams agent disabled or not configured';
            await this.databaseService.logEvent(
              dungeonRunId,
              runLog.id,
              'agent_error',
              msg,
              { reason: 'disabled_or_missing_key' }
            );
            await this.databaseService.updateRunLog(runLog.id, { status: 'error', error_message: msg });
            await this.databaseService.failDungeonRun(dungeonRunId, msg);
            return false;
          }

          let lootChoice: any;
          try {
            const { buildLootSystem, buildStrategyContext, sanitizeLootOptionsForLLM, sanitizeStateForLLM } = await import('../gigaverse/gigaverse.prompts');
            const system = buildLootSystem();
            const locLoot = computeStageRoom(dungeonState.currentRoom);
            const strategy = buildStrategyContext(context, { stage: locLoot.stage, room: locLoot.room, absRoom: dungeonState.currentRoom });
            const compactState = sanitizeStateForLLM({
              currentDungeon: dungeonState.currentDungeon,
              currentRoom: dungeonState.currentRoom,
              currentEnemy: dungeonState.currentEnemy,
              lootPhase: dungeonState.lootPhase,
              lastBattleResult: dungeonState.lastBattleResult,
              player: dungeonState.player,
              enemy: dungeonState.enemy,
            });
            const optionsSafe = sanitizeLootOptionsForLLM(dungeonState.lootOptions);
            const compositeLoot = [
              'Context:', strategy,
              'State:', JSON.stringify(compactState),
              'LootOptions:', JSON.stringify(optionsSafe),
              'RoomDecisionHistory:', JSON.stringify(roomDecisionHistory || []),
              (await import('../gigaverse/gigaverse.prompts')).buildLootInstruction(),
            ].join('\n');
            const modelIdLoot = llmModel || (await import('../../infrastructure/config/ai.config')).aiConfig.model;
            let parsedLoot: any = null;
            let textLoot = '';
            const MAX_ATTEMPTS_LOOT = 3;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS_LOOT; attempt++) {
              try {
                textLoot = await this.agent.decideText(modelIdLoot, system, compositeLoot);
                parsedLoot = (await import('../gigaverse/gigaverse.prompts')).parseLootFromText(textLoot || '');
                await this.databaseService.logEvent(
                  dungeonRunId,
                  runLog.id,
                  'agent_decision_loot',
                  `Agent loot decision (attempt ${attempt}/${MAX_ATTEMPTS_LOOT}): ${parsedLoot.loot || 'invalid'}`,
                  { reason: parsedLoot.reason, raw: (textLoot || '').slice(0, 300) }
                );
                if (parsedLoot.loot) break;
              } catch (e) {
                await this.databaseService.logEvent(
                  dungeonRunId,
                  runLog.id,
                  'agent_error',
                  `Agent loot parsing error (attempt ${attempt}/${MAX_ATTEMPTS_LOOT})`,
                  { phase: 'loot', error: String(e) }
                );
              }
              if (attempt < MAX_ATTEMPTS_LOOT) await sleep(200);
            }

            if (!parsedLoot?.loot) throw new Error('Failed to parse loot from agent response');
            lootChoice = parsedLoot.loot;
            lootChoices.push(lootChoice);
            roomDecisionHistory.push({ kind: 'loot', choice: lootChoice, reason: parsedLoot.reason || '' });
          } catch (err) {
            const message = `Agent loot decision failed: ${formatErrorMessage(err)}`;
            await this.databaseService.logEvent(
              dungeonRunId,
              runLog.id,
              'agent_error',
              message,
              { phase: 'loot', error: formatErrorMessage(err), model: llmModel || 'default', room: dungeonState.currentRoom }
            );
            await this.databaseService.updateRunLog(runLog.id, { status: 'error', error_message: message });
            await this.databaseService.abortDungeonRun(dungeonRunId, message);
            return false;
          }
          
          const lootData = {
            consumables,
            itemId: 0,
            index: 0,
            isJuiced,
            gearInstanceIds
          };
          
          await sleep(ACTION_DELAY_MS);
          // Snapshot stats before loot to compute deltas
          const before = dungeonState.player;
          const lootResponse = await gameClient.selectLoot(lootChoice as any, dungeonId, lootData);
          
          if (!lootResponse.success) {
            throw new Error(`Loot selection failed: ${lootResponse.message}`);
          }
          
          dungeonState = parseDungeonState(lootResponse);
          if (!dungeonState) {
            throw new Error('Failed to parse dungeon state after loot selection');
          }
          
          // Track items (rare on loot) if any
          const itemsGainedThisLoot = Array.isArray((lootResponse as any).gameItemBalanceChanges)
            ? (lootResponse as any).gameItemBalanceChanges.length
            : 0;
          itemsGained += itemsGainedThisLoot;

          // Compute stat deltas from before → after
          const after = dungeonState.player;
          const delta: Record<string, number> = {};
          function addDelta(key: string, a?: number, b?: number) {
            const d = (Number(b ?? 0) - Number(a ?? 0));
            if (d > 0) {
              delta[key] = (delta[key] || 0) + d;
              statsTally[key] = (statsTally[key] || 0) + d;
            }
          }
          try {
            addDelta('health.max', before?.health?.currentMax, after?.health?.currentMax);
            addDelta('shield.max', before?.shield?.currentMax, after?.shield?.currentMax);
            addDelta('rock.atk', before?.rock?.currentATK, after?.rock?.currentATK);
            addDelta('rock.def', before?.rock?.currentDEF, after?.rock?.currentDEF);
            addDelta('paper.atk', before?.paper?.currentATK, after?.paper?.currentATK);
            addDelta('paper.def', before?.paper?.currentDEF, after?.paper?.currentDEF);
            addDelta('scissor.atk', before?.scissor?.currentATK, after?.scissor?.currentATK);
            addDelta('scissor.def', before?.scissor?.currentDEF, after?.scissor?.currentDEF);
          } catch {}
          
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'loot_selected',
            `Selected ${lootChoice}, gained ${itemsGainedThisLoot} items`,
            { lootChoice, itemsGained: itemsGainedThisLoot, statsDelta: delta, statsTally }
          );

        } else {
          // Combat phase - use heuristics for next move
          const { sanitizeStateForLLM } = await import('../gigaverse/gigaverse.prompts');
          const statePreview = sanitizeStateForLLM({
            currentDungeon: dungeonState.currentDungeon,
            currentRoom: dungeonState.currentRoom,
            currentEnemy: dungeonState.currentEnemy,
            lootPhase: dungeonState.lootPhase,
            lastBattleResult: dungeonState.lastBattleResult,
            player: dungeonState.player,
            enemy: dungeonState.enemy,
          });
          const srEnter = computeStageRoom(dungeonState.currentRoom);
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'room_entered',
            `Entered stage ${srEnter.stage}-${srEnter.room} (abs ${dungeonState.currentRoom}), enemy ${dungeonState.currentEnemy}`,
            { 
              room: dungeonState.currentRoom, 
              enemy: dungeonState.currentEnemy,
              playerHP: dungeonState.player.health.current,
              enemyHP: dungeonState.enemy.health.current,
              state: statePreview,
              stage: srEnter.stage,
              roomInStage: srEnter.room
            }
          );
          
          // Agent-only decision for move
          if (!this.agent || !this.agent.isEnabled) {
            const msg = 'Daydreams agent disabled or not configured';
            await this.databaseService.logEvent(
              dungeonRunId,
              runLog.id,
              'agent_error',
              msg,
              { reason: 'disabled_or_missing_key' }
            );
            await this.databaseService.updateRunLog(runLog.id, { status: 'error', error_message: msg });
            await this.databaseService.failDungeonRun(dungeonRunId, msg);
            return false;
          }

          let move: any;
          try {
            const { buildMoveSystem, buildStrategyContext, sanitizeStateForLLM, buildMoveInstruction, parseMoveFromText } = await import('../gigaverse/gigaverse.prompts');
            const system = buildMoveSystem();
            const locMove = computeStageRoom(dungeonState.currentRoom);
            const strategy = buildStrategyContext(context, { stage: locMove.stage, room: locMove.room, absRoom: dungeonState.currentRoom });
            const compactState = sanitizeStateForLLM({
              currentDungeon: dungeonState.currentDungeon,
              currentRoom: dungeonState.currentRoom,
              currentEnemy: dungeonState.currentEnemy,
              lootPhase: dungeonState.lootPhase,
              lastBattleResult: dungeonState.lastBattleResult,
              player: dungeonState.player,
              enemy: dungeonState.enemy,
            });
            const compositeMove = [
              'Context:', strategy,
              'State:', JSON.stringify(compactState),
              'RoomDecisionHistory:', JSON.stringify(roomDecisionHistory || []),
              buildMoveInstruction(),
            ].join('\n');
            const modelIdMove = llmModel || (await import('../../infrastructure/config/ai.config')).aiConfig.model;
            let parsedMove: any = null;
            let textMove = '';
            const MAX_ATTEMPTS_MOVE = 3;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS_MOVE; attempt++) {
              try {
                textMove = await this.agent.decideText(modelIdMove, system, compositeMove);
                parsedMove = parseMoveFromText(textMove || '');
                await this.databaseService.logEvent(
                  dungeonRunId,
                  runLog.id,
                  'agent_decision_move',
                  `Agent move decision (attempt ${attempt}/${MAX_ATTEMPTS_MOVE}): ${parsedMove.move || 'invalid'}`,
                  { reason: parsedMove.reason, raw: (textMove || '').slice(0, 300) }
                );
                if (parsedMove.move) break;
              } catch (e) {
                await this.databaseService.logEvent(
                  dungeonRunId,
                  runLog.id,
                  'agent_error',
                  `Agent move parsing error (attempt ${attempt}/${MAX_ATTEMPTS_MOVE})`,
                  { phase: 'combat', error: String(e) }
                );
              }
              if (attempt < MAX_ATTEMPTS_MOVE) await sleep(200);
            }

            if (!parsedMove?.move) throw new Error('Failed to parse move from agent response');
            move = parsedMove.move;
            moves.push(move);
            roomDecisionHistory.push({ kind: 'move', choice: move, reason: parsedMove.reason || '' });
          } catch (err) {
            const message = `Agent move decision failed: ${formatErrorMessage(err)}`;
            await this.databaseService.logEvent(
              dungeonRunId,
              runLog.id,
              'agent_error',
              message,
              { phase: 'combat', error: formatErrorMessage(err), model: llmModel || 'default', room: dungeonState.currentRoom }
            );
            await this.databaseService.updateRunLog(runLog.id, { status: 'error', error_message: message });
            await this.databaseService.abortDungeonRun(dungeonRunId, message);
            return false;
          }
          
          const moveData = {
            consumables,
            itemId: 0,
            index: 0,
            isJuiced,
            gearInstanceIds
          };
          
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'combat_move',
            `Making move: ${move}`,
            { move, playerCharges: dungeonState.player[move].currentCharges }
          );
          
          await sleep(ACTION_DELAY_MS);
          const moveResponse = await gameClient.makeMove(move as any, dungeonId, moveData);
          
          if (!moveResponse.success) {
            throw new Error(`Combat move failed: ${moveResponse.message}`);
          }
          
          // Track gear/items gained after this action if any
          try {
            const changes = Array.isArray((moveResponse as any).gameItemBalanceChanges)
              ? (moveResponse as any).gameItemBalanceChanges as any[]
              : [];
            const byRarityDelta: Record<string, number> = {};
            const byIdDelta: Record<string, number> = {};
            let gained = 0;
            for (const ch of changes) {
              const amt = Number(ch?.amount || 0);
              if (amt > 0) {
                gained += amt;
                const rarity = String(ch?.rarity ?? 'unknown');
                byRarityDelta[rarity] = (byRarityDelta[rarity] || 0) + amt;
                const id = String(ch?.id ?? 'unknown');
                byIdDelta[id] = (byIdDelta[id] || 0) + amt;
              }
            }
            if (gained > 0) {
              itemsGained += gained;
              await this.databaseService.logEvent(
                dungeonRunId,
                runLog.id,
                'loot_selected',
                `Gained ${gained} item(s) from combat`,
                { gainedFrom: 'combat', itemsGainedNow: gained, totalItemsGained: itemsGained, byRarityDelta, byIdDelta }
              );
            }
          } catch {}

          dungeonState = parseDungeonState(moveResponse);
          if (!dungeonState) {
            throw new Error('Failed to parse dungeon state after move');
          }
          
          const battleResult = dungeonState.lastBattleResult;
          
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'battle_result',
            `Battle result: ${battleResult || 'ongoing'}`,
            { 
              result: battleResult,
              playerHP: dungeonState.player.health.current,
              enemyHP: dungeonState.enemy.health.current
            }
          );
          
          if (battleResult === 'win') {
            battlesWon++;
            roomsCleared++;
            
            await this.databaseService.logEvent(
              dungeonRunId,
              runLog.id,
              'room_cleared',
              `Room ${dungeonState.currentRoom} cleared! Moving to next room`,
              { roomsCleared }
            );
          } else if (battleResult === 'lose') {
            battlesLost++;
          }
        }
        
        // Check completion
        if (dungeonState.isComplete) {
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'run_completed',
            `Run ${runNumber} completed! Cleared ${roomsCleared} rooms`,
            { status: 'completed', roomsCleared, battlesWon, battlesLost, itemsGained, statsTally }
          );
          
          // Keep token to satisfy server tracking for the next action
          console.log(`[TokenDebug] Run ${runNumber} COMPLETED - preserving token: ${gameClient.getActionToken()}`);
          break;
        }
        
        if (dungeonState.player?.health?.current <= 0) {
          await this.databaseService.logEvent(
            dungeonRunId,
            runLog.id,
            'run_completed',
            `Run ${runNumber} failed - Player died`,
            { status: 'died', roomsCleared, battlesWon, battlesLost, itemsGained }
          );
          
          // Keep token; server may require prior token for tracking
          console.log(`[TokenDebug] Run ${runNumber} DIED - preserving token: ${gameClient.getActionToken()}`);
          break;
        }
      }
      
      // Update run log with final stats
      const endHP = dungeonState.player?.health?.current || 0;
      const finalStatus = dungeonState.isComplete ? 'completed' : 'died';
      
      await this.databaseService.updateRunLog(runLog.id, {
        status: finalStatus,
        rooms_cleared: roomsCleared,
        battles_won: battlesWon,
        battles_lost: battlesLost,
        items_gained: itemsGained,
        moves,
        loot_choices: lootChoices,
        player_stats: { startHP, endHP, maxHP },
        end_time: new Date().toISOString()
      });
      
      console.log(`✅ Run ${runNumber} ${finalStatus}: ${roomsCleared} rooms, ${itemsGained} items`);
      return finalStatus === 'completed';
      
    } catch (error) {
      console.error(`❌ Run ${runNumber} error:`, error);
      
      await this.databaseService.logEvent(
        dungeonRunId,
        runLog.id,
        'error',
        `Run ${runNumber} error: ${formatError(error)}`,
        { error: formatError(error) }
      );

      await this.databaseService.updateRunLog(runLog.id, {
        status: 'error',
        rooms_cleared: roomsCleared,
        battles_won: battlesWon,
        battles_lost: battlesLost,
        items_gained: itemsGained,
        moves,
        loot_choices: lootChoices,
        end_time: new Date().toISOString(),
        error_message: formatError(error)
      });
      
      // Keep token; server may require prior token for next action
      console.log(`[TokenDebug] Run ${runNumber} ERROR - preserving token: ${gameClient.getActionToken()}`);
      return false;
    }
  }
  
  private async checkAndInitializeDungeon(
    dungeonRunId: string,
    runLogId: string,
    gameClient: GigaverseGameClient,
    dungeonId: number,
    isJuiced: boolean,
    consumables: any[],
    gearInstanceIds: string[]
  ): Promise<{ dungeonState: GigaverseDungeonState | null, isResumed: boolean }> {
    try {
      console.log(`[InitDebug] ========== DUNGEON INITIALIZATION START ==========`);
      console.log(`[InitDebug] dungeonRunId: ${dungeonRunId}`);
      console.log(`[InitDebug] runLogId: ${runLogId}`);
      console.log(`[InitDebug] dungeonId: ${dungeonId}`);
      console.log(`[InitDebug] Current token before status check: ${gameClient.getActionToken()}`);
      
      // Step 1: Query Gigaverse API for current player status  
      console.log(`[InitDebug] Step 1: Fetching dungeon state...`);
      const statusResponse = await gameClient.fetchDungeonState();
      console.log(`[InitDebug] Status response success: ${statusResponse.success}`);
      console.log(`[InitDebug] Status response:`, JSON.stringify(statusResponse, null, 2));
      
      // Step 2: Check if player is already in a dungeon run
      console.log(`[InitDebug] Step 2: Checking for existing run...`);
      console.log(`[InitDebug] Has existing run data: ${!!statusResponse.data?.run}`);
      
      if (statusResponse.success && statusResponse.data?.run) {
        console.log(`[InitDebug] Found existing run, parsing state...`);
        const existingState = parseDungeonState(statusResponse);
        console.log(`[InitDebug] Parsed state exists: ${!!existingState}`);
        console.log(`[InitDebug] State isComplete: ${existingState?.isComplete}`);
        console.log(`[InitDebug] Player health: ${existingState?.player?.health?.current}`);
        
        if (existingState && 
            !existingState.isComplete && 
            existingState.player?.health?.current > 0) {
          
          console.log(`[InitDebug] Resuming existing run - updating token`);
          // Set action token from resumed state if available
          if (statusResponse.actionToken) {
            console.log(`[InitDebug] Setting token from response: ${statusResponse.actionToken}`);
            gameClient.setActionToken(statusResponse.actionToken);
          }
          
          await this.databaseService.logEvent(
            dungeonRunId,
            runLogId,
            'run_started',
            `Resuming existing run at room ${existingState.currentRoom}`,
            { resumed: true, room: existingState.currentRoom }
          );
          
          console.log(`[InitDebug] ✅ Resuming existing run at room ${existingState.currentRoom}`);
          return { dungeonState: existingState, isResumed: true };
        }
        console.log(`[InitDebug] Existing run not resumable - will start new`);
      }
      
      // Step 3: No existing run or run is complete/dead - start new one
      console.log(`[InitDebug] Step 3: Starting new dungeon run...`);
      console.log(`[InitDebug] Token before startRun: ${gameClient.getActionToken()}`);
      
      const startPayload = {
        dungeonId,
        data: {
          consumables,
          itemId: 0,
          index: 0,
          isJuiced,
          gearInstanceIds
        }
      };
      
      console.log(`[InitDebug] Start payload:`, JSON.stringify(startPayload, null, 2));
      console.log(`[InitDebug] Waiting ${ACTION_DELAY_MS}ms before API call...`);
      await sleep(ACTION_DELAY_MS);
      
      console.log(`[InitDebug] Calling gameClient.startRun()...`);
      let startResponse = await gameClient.startRun(startPayload);
      
      console.log(`[InitDebug] StartRun response success: ${startResponse.success}`);
      console.log(`[InitDebug] StartRun response:`, JSON.stringify(startResponse, null, 2));
      console.log(`[InitDebug] Token after startRun: ${gameClient.getActionToken()}`);
      
      if (!startResponse.success) {
        console.log(`[InitDebug] ❌ Start run failed: ${startResponse.message}`);
        // Retry once if token-related: try refreshing token via status and retry
        try {
          console.log(`[InitDebug] Attempting token refresh via fetchDungeonState ...`);
          const status2 = await gameClient.fetchDungeonState();
          if (status2 && (status2 as any).actionToken) {
            gameClient.setActionToken((status2 as any).actionToken);
            console.log(`[InitDebug] Retrying startRun with refreshed token: ${(status2 as any).actionToken}`);
            startResponse = await gameClient.startRun(startPayload);
          }
        } catch {}
        if (!startResponse.success) {
          throw new Error(`Failed to start run: ${startResponse.message}`);
        }
      }
      
      console.log(`[InitDebug] Parsing dungeon state from response...`);
      const dungeonState = parseDungeonState(startResponse);
      console.log(`[InitDebug] Parsed state exists: ${!!dungeonState}`);
      console.log(`[InitDebug] Current room: ${dungeonState?.currentRoom}`);
      
      if (!dungeonState) {
        console.log(`[InitDebug] ❌ Failed to parse dungeon state`);
        throw new Error('Failed to parse initial dungeon state');
      }
      
      await this.databaseService.logEvent(
        dungeonRunId,
        runLogId,
        'run_started',
        `Started new dungeon run`,
        { resumed: false, room: dungeonState.currentRoom }
      );
      
      console.log(`[InitDebug] ✅ Started new dungeon run at room ${dungeonState.currentRoom}`);
      console.log(`[InitDebug] ========== DUNGEON INITIALIZATION END ==========`);
      return { dungeonState, isResumed: false };
      
    } catch (error) {
      console.log(`[InitDebug] ❌ INITIALIZATION ERROR:`, error);
      console.log(`[InitDebug] Error type: ${error?.constructor?.name}`);
      console.log(`[InitDebug] Error message: ${error?.message}`);
      console.log(`[InitDebug] ========== DUNGEON INITIALIZATION ERROR END ==========`);
      throw error;
    }
  }

  /**
   * Get complete dungeon run data (for API endpoints that need full data)
   */
  async getDungeonRunData(dungeonRunId: string) {
    return this.databaseService.getDungeonRunComplete(dungeonRunId);
  }
}
