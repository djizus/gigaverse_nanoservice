import { StateAdapter, DecisionType } from './adapter.interface';
import { computeStageRoom } from '../../gigaverse/gigaverse.utils';
import {
  buildLootSystem,
  buildMoveSystem,
  buildStrategyContext as buildDungeonStrategy,
  sanitizeStateForLLM,
  sanitizeLootOptionsForLLM,
  buildMoveInstruction,
  buildLootInstruction,
  parseLootFromText,
  parseMoveFromText,
} from '../gigaverse.prompts';

export class DungeonStateAdapter implements StateAdapter {
  id = 'gigaverse-dungeon';

  buildSystem(decision: DecisionType, _userInstructions?: string): string {
    if (decision === 'loot') return buildLootSystem();
    if (decision === 'move') return buildMoveSystem();
    throw new Error(`Unsupported decision type for dungeon: ${decision}`);
  }

  composePrompt(decision: DecisionType, ctx: any): string {
    const { state, user_instructions, roomDecisionHistory, currentRoom } = ctx || {};
    const compactState = sanitizeStateForLLM(state || {});
    const loc = computeStageRoom(currentRoom || compactState?.currentRoom || 1);
    const strategy = buildDungeonStrategy(user_instructions || '', { stage: loc.stage, room: loc.room, absRoom: currentRoom });

    const parts: string[] = [
      'Context:', strategy,
      'State:', JSON.stringify(compactState),
      'RoomDecisionHistory:', JSON.stringify(roomDecisionHistory || []),
    ];
    if (decision === 'loot') {
      const optionsSafe = sanitizeLootOptionsForLLM((ctx?.lootOptions) || []);
      parts.push('LootOptions:', JSON.stringify(optionsSafe), buildLootInstruction());
    } else if (decision === 'move') {
      parts.push(buildMoveInstruction());
    } else {
      throw new Error(`Unsupported decision type for dungeon: ${decision}`);
    }
    return parts.join('\n');
  }

  parse(decision: DecisionType, text: string): any {
    if (decision === 'loot') return parseLootFromText(text || '');
    if (decision === 'move') return parseMoveFromText(text || '');
    throw new Error(`Unsupported decision type for dungeon: ${decision}`);
  }

  success(decision: DecisionType, parsed: any): boolean {
    if (decision === 'loot') return !!parsed?.loot;
    if (decision === 'move') return !!parsed?.move;
    return false;
  }
}
