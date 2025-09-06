// Gigaverse State Parsing & Utility Functions
// Based on ~/fun/client/src/games/gigaverse/utils.ts

import { 
  GigaverseApiResponse, 
  GigaverseDungeonState, 
  Player, 
  GigaverseMemory 
} from './gigaverse.types';

/**
 * Parse API response into structured dungeon state
 * Handles edge cases and determines battle results
 */
export function parseDungeonState(response: GigaverseApiResponse): GigaverseDungeonState | null {
  try {
    // Also check for response.run for fetchDungeonState responses
    const run = response.data?.run || response.run;
    const entity = response.data?.entity || response.entity;
    
    if (!run?.players) {
      console.warn('[GigaverseUtils] Invalid response structure - no run.players found');
      return null;
    }

    const [player, enemy] = run.players;
    
    if (!player || !enemy) {
      console.warn('[GigaverseUtils] Missing player or enemy data');
      return null;
    }

    // Determine battle result
    let lastBattleResult: "win" | "lose" | "draw" | null = null;
    
    if (player.thisPlayerWin === true) {
      lastBattleResult = "win";
    } else if (enemy.thisPlayerWin === true) {
      lastBattleResult = "lose";  
    } else if (player.lastMove && enemy.lastMove) {
      lastBattleResult = "draw";
    }

    // Check if dungeon is complete
    const isComplete = entity?.COMPLETE_CID || 
                      (player.health.current <= 0) || 
                      (enemy.health.current <= 0 && !run.lootPhase);

    const dungeonState: GigaverseDungeonState = {
      currentDungeon: entity?.DUNGEON_ID_CID || 0,
      currentRoom: entity?.ROOM_NUM_CID || 1,
      currentEnemy: entity?.ENEMY_CID || 1,
      player,
      enemy,
      lootPhase: run.lootPhase || false,
      lootOptions: run.lootOptions || [],
      lastBattleResult,
      actionToken: response.actionToken,
      isComplete
    };

    console.log('[GigaverseUtils] Parsed dungeon state:', {
      room: dungeonState.currentRoom,
      enemy: dungeonState.currentEnemy,
      lootPhase: dungeonState.lootPhase,
      battleResult: lastBattleResult,
      isComplete: dungeonState.isComplete,
      playerHealth: player.health.current,
      enemyHealth: enemy.health.current
    });

    return dungeonState;
    
  } catch (error) {
    console.error('[GigaverseUtils] Error parsing dungeon state:', error);
    return null;
  }
}

/**
 * Determine the best move based on enemy's last move, current stats, and context
 * Enhanced rock-paper-scissors strategy with context-driven decisions
 */
export function suggestBestMove(player: Player, enemy: Player, context?: string): "rock" | "paper" | "scissor" {
  // Rock beats Scissor, Scissor beats Paper, Paper beats Rock
  const moveCounters = {
    rock: "paper",
    paper: "scissor", 
    scissor: "rock"
  } as const;

  const moves = [
    { name: "rock" as const, attack: player.rock.currentATK, charges: player.rock.currentCharges },
    { name: "paper" as const, attack: player.paper.currentATK, charges: player.paper.currentCharges },
    { name: "scissor" as const, attack: player.scissor.currentATK, charges: player.scissor.currentCharges }
  ];

  // Filter moves with charges available
  const availableMoves = moves.filter(move => move.charges > 0);
  
  if (availableMoves.length === 0) {
    console.warn('[GigaverseUtils] No moves with charges available, defaulting to rock');
    return "rock";
  }

  // Context-driven strategy
  if (context) {
    const contextLower = context.toLowerCase();
    if (contextLower.includes('aggressive') || contextLower.includes('attack')) {
      // Favor rock (sword) for aggressive play
      const rockMove = availableMoves.find(m => m.name === 'rock');
      if (rockMove) {
        console.log(`[GigaverseUtils] Aggressive context - using rock (${rockMove.charges} charges)`);
        return 'rock';
      }
    }
    if (contextLower.includes('defensive') || contextLower.includes('shield')) {
      // Favor scissor (shield) for defensive play  
      const scissorMove = availableMoves.find(m => m.name === 'scissor');
      if (scissorMove) {
        console.log(`[GigaverseUtils] Defensive context - using scissor (${scissorMove.charges} charges)`);
        return 'scissor';
      }
    }
    if (contextLower.includes('magic') || contextLower.includes('spell')) {
      // Favor paper (spell) for magic-focused play
      const paperMove = availableMoves.find(m => m.name === 'paper');
      if (paperMove) {
        console.log(`[GigaverseUtils] Magic context - using paper (${paperMove.charges} charges)`);
        return 'paper';
      }
    }
  }

  // If enemy has a last move, try to counter it
  if (enemy.lastMove && enemy.lastMove in moveCounters) {
    const counterMove = moveCounters[enemy.lastMove as keyof typeof moveCounters];
    const counter = availableMoves.find(m => m.name === counterMove);
    if (counter) {
      console.log(`[GigaverseUtils] Countering enemy's ${enemy.lastMove} with ${counterMove}`);
      return counterMove;
    }
  }

  // Default: choose based on highest attack power
  const bestMove = availableMoves.reduce((best, current) => 
    current.attack > best.attack ? current : best
  );

  console.log(`[GigaverseUtils] Selected ${bestMove.name} (ATK: ${bestMove.attack}, charges: ${bestMove.charges})`);
  return bestMove.name;
}

/**
 * Suggest best loot choice based on loot options, current player state, and context
 */
export function suggestBestLoot(
  lootOptions: any[], 
  player: Player, 
  context?: string
): "loot_one" | "loot_two" | "loot_three" | "loot_four" {
  if (lootOptions.length === 0) {
    return "loot_one";
  }

  const lootChoices = ["loot_one", "loot_two", "loot_three", "loot_four"] as const;
  let bestLootIndex = 0;
  let reasoning = "Default selection";

  // Context-driven loot selection
  if (context) {
    const contextLower = context.toLowerCase();
    const healthPercent = (player.health.current / player.health.currentMax) * 100;
    
    // If health is low and context mentions survival
    if (healthPercent < 50 && (contextLower.includes('survive') || contextLower.includes('heal'))) {
      const healingIndex = lootOptions.findIndex(loot => 
        loot.boonTypeString?.toLowerCase().includes('heal')
      );
      if (healingIndex !== -1) {
        bestLootIndex = healingIndex;
        reasoning = `Health critical (${healthPercent.toFixed(1)}%), prioritizing healing loot`;
      }
    }
    // If context emphasizes quality/rarity
    else if (contextLower.includes('rare') || contextLower.includes('quality') || contextLower.includes('valuable')) {
      let bestRarity = -1;
      lootOptions.forEach((loot, index) => {
        if (loot.RARITY_CID > bestRarity) {
          bestRarity = loot.RARITY_CID;
          bestLootIndex = index;
        }
      });
      reasoning = `Quality-focused: selected rarity ${bestRarity} item`;
    }
    // If context emphasizes attack/damage
    else if (contextLower.includes('attack') || contextLower.includes('damage') || contextLower.includes('aggressive')) {
      const attackUpgradeIndex = lootOptions.findIndex(loot =>
        loot.boonTypeString?.toLowerCase().includes('rock') || 
        loot.boonTypeString?.toLowerCase().includes('attack')
      );
      if (attackUpgradeIndex !== -1) {
        bestLootIndex = attackUpgradeIndex;
        reasoning = `Attack-focused: upgrading combat abilities`;
      }
    }
  }

  // Default priority system if no context match
  if (reasoning === "Default selection") {
    const lootPriorities = {
      "Heal": 100,
      "UpgradeRock": player.rock.currentATK,
      "UpgradePaper": player.paper.currentATK, 
      "UpgradeScissor": player.scissor.currentATK
    };

    let bestPriority = -1;
    lootOptions.forEach((loot, index) => {
      const priority = lootPriorities[loot.boonTypeString as keyof typeof lootPriorities] || 0;
      if (priority > bestPriority) {
        bestPriority = priority;
        bestLootIndex = index;
      }
    });
    reasoning = `Default priority: ${lootOptions[bestLootIndex]?.boonTypeString}`;
  }

  const choice = lootChoices[bestLootIndex] || "loot_one";
  
  console.log(`[GigaverseUtils] Selected ${choice} - ${reasoning}`);
  return choice;
}

/**
 * Update memory after a successful action
 */
export function updateMemoryAfterAction(
  memory: GigaverseMemory,
  dungeonState: GigaverseDungeonState,
  actionDescription: string
): GigaverseMemory {
  const updatedMemory = { ...memory };
  
  // Update current dungeon state
  updatedMemory.currentDungeonState = dungeonState;
  updatedMemory.lastActionResult = actionDescription;

  // Update rewards tracking
  if (dungeonState.lastBattleResult === "win") {
    updatedMemory.totalRewards.battlesWon++;
  } else if (dungeonState.lastBattleResult === "lose") {
    updatedMemory.totalRewards.battlesLost++;
  }

  // Track room progression
  if (dungeonState.currentRoom > (memory.currentDungeonState?.currentRoom || 0)) {
    updatedMemory.totalRewards.roomsCleared++;
  }

  // Track completed runs
  if (dungeonState.isComplete) {
    updatedMemory.completedRuns.push(dungeonState);
    updatedMemory.currentRun++;
    updatedMemory.currentDungeonState = undefined; // Clear current state
  }

  return updatedMemory;
}

/**
 * Format player stats for display
 */
export function formatPlayerStats(player: Player): string {
  return `
Player Stats:
- Health: ${player.health.current}/${player.health.currentMax}
- Shield: ${player.shield.current}/${player.shield.currentMax}
- Rock: ATK ${player.rock.currentATK} | DEF ${player.rock.currentDEF} | Charges ${player.rock.currentCharges}/${player.rock.maxCharges}
- Paper: ATK ${player.paper.currentATK} | DEF ${player.paper.currentDEF} | Charges ${player.paper.currentCharges}/${player.paper.maxCharges}  
- Scissor: ATK ${player.scissor.currentATK} | DEF ${player.scissor.currentDEF} | Charges ${player.scissor.currentCharges}/${player.scissor.maxCharges}
- Equipment: ${player.equipment.length} items
- Last Move: ${player.lastMove || 'None'}
`.trim();
}

/**
 * Format battle summary
 */
export function formatBattleSummary(dungeonState: GigaverseDungeonState): string {
  const { player, enemy, lastBattleResult, currentRoom, currentEnemy } = dungeonState;
  
  return `
🏰 Room ${currentRoom} - Enemy ${currentEnemy}
${lastBattleResult ? `⚔️ Battle Result: ${lastBattleResult.toUpperCase()}` : '⚔️ Battle in progress'}
👤 Player: ${player.health.current}/${player.health.currentMax} HP | ${player.shield.current}/${player.shield.currentMax} Shield
👹 Enemy: ${enemy.health.current}/${enemy.health.currentMax} HP | ${enemy.shield.current}/${enemy.shield.currentMax} Shield
${dungeonState.lootPhase ? '🎁 Loot phase - choose reward!' : '⚔️ Combat phase - select move!'}
`.trim();
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format error messages consistently
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

/**
 * Compute stage/room from absolute room number.
 * Stages are 1..4 and rooms are 1..4. Example: 12 => 3-4, 16 => 4-4, 2 => 1-2
 */
export function computeStageRoom(absRoom: number): { stage: number; room: number } {
  const r = Math.max(1, Number(absRoom) || 1);
  const stage = Math.min(4, Math.ceil(r / 4));
  const room = ((r - 1) % 4) + 1;
  return { stage, room };
}
