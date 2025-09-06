// Gigaverse decision prompt builders (system + context composers)

export function buildMoveSystem(): string {
  return [
    'You are a tactical assistant for a turn-based Gigaverse dungeon.',
    'Decide the single best combat move now: rock, paper, or scissor.',
    'Rules: only choose moves with charges > 0; consider player/enemy HP & shields, lastMove, current room & enemy.',
    'Respond in plain text/markdown, with exactly these lines:',
    'Move: rock|paper|scissor',
    'Reason: <one sentence (<=180 chars)>',
  ].join(' ');
}

export function buildLootSystem(): string {
  return [
    'You are a tactical assistant for a Gigaverse dungeon.',
    'Select the single best loot option now among loot_one, loot_two, loot_three, loot_four.',
    'Consider current room and player stats (HP, shield, charges) and each option\'s boon/rarity.',
    'Respond in plain text/markdown, with exactly these lines:',
    'Loot: 1|2|3|4',
    'Reason: <one sentence (<=180 chars)>',
  ].join(' ');
}

export function buildStrategyContext(
  userContext: string,
  opts?: { stage?: number; room?: number; absRoom?: number }
): string {
  const base = (userContext || '').trim() || 'Maximize survival and progress with clear, legal moves.';
  const loc = (opts?.stage && opts?.room)
    ? `Location: Stage ${opts.stage}-${opts.room}${opts?.absRoom ? ` (abs ${opts.absRoom})` : ''}`
    : undefined;
  return [
    'Strategy:', base,
    loc ? loc : undefined,
    'Guidelines:',
    '- Only legal moves (charges > 0).',
    '- If low HP (<30%), prefer safer outcomes unless a winning move is certain.',
    '- Use RPS countering vs enemy.lastMove when EV is tied.',
  ].filter(Boolean).join('\n');
}

export function buildMoveInstruction(): string {
  return [
    'Format your answer as:',
    'Move: rock|paper|scissor',
    'Reason: <short>'
  ].join('\n');
}

export function buildLootInstruction(): string {
  return [
    'Format your answer as:',
    'Loot: 1|2|3|4',
    'Reason: <short>'
  ].join('\n');
}

export function parseMoveFromText(text: string): { move?: 'rock'|'paper'|'scissor'; reason?: string } {
  const out: { move?: 'rock'|'paper'|'scissor'; reason?: string } = {};
  if (!text) return out;
  const m = text.match(/\bmove\s*:\s*(rock|paper|scissor)\b/i);
  if (m) out.move = m[1].toLowerCase() as any;
  const r = text.match(/\breason\s*:\s*(.+)/i);
  if (r) out.reason = r[1].trim();
  return out;
}

export function parseLootFromText(text: string): { loot?: 'loot_one'|'loot_two'|'loot_three'|'loot_four'; reason?: string } {
  const out: { loot?: 'loot_one'|'loot_two'|'loot_three'|'loot_four'; reason?: string } = {};
  if (!text) return out;
  const m = text.match(/\bloot\s*:\s*([1-4])\b/i);
  if (m) {
    const map: Record<string, any> = { '1': 'loot_one', '2': 'loot_two', '3': 'loot_three', '4': 'loot_four' };
    out.loot = map[m[1]];
  }
  const r = text.match(/\breason\s*:\s*(.+)/i);
  if (r) out.reason = r[1].trim();
  return out;
}

export function sanitizeStateForLLM(state: any) {
  if (!state) return {};
  try {
    const { currentDungeon, currentRoom, currentEnemy, lastBattleResult, lootPhase, player, enemy } = state;
    const { computeStageRoom } = require('./gigaverse.utils');
    const sr = computeStageRoom ? computeStageRoom(currentRoom) : { stage: 1, room: currentRoom || 1 };
    const pick = (p: any) => p ? {
      health: p.health ? { current: p.health.current, currentMax: p.health.currentMax } : undefined,
      shield: p.shield ? { current: p.shield.current, currentMax: p.shield.currentMax } : undefined,
      rock: p.rock ? { currentATK: p.rock.currentATK, currentDEF: p.rock.currentDEF, currentCharges: p.rock.currentCharges } : undefined,
      paper: p.paper ? { currentATK: p.paper.currentATK, currentDEF: p.paper.currentDEF, currentCharges: p.paper.currentCharges } : undefined,
      scissor: p.scissor ? { currentATK: p.scissor.currentATK, currentDEF: p.scissor.currentDEF, currentCharges: p.scissor.currentCharges } : undefined,
      lastMove: p.lastMove ?? null,
    } : undefined;
    return {
      currentDungeon,
      currentRoom,
      currentEnemy,
      lootPhase: !!lootPhase,
      stage: sr.stage,
      roomInStage: sr.room,
      lastBattleResult: lastBattleResult ?? null,
      player: pick(player),
      enemy: pick(enemy),
    };
  } catch {
    return {};
  }
}

export function sanitizeLootOptionsForLLM(options: any[]): any[] {
  try {
    return (options || []).map((o) => ({
      boonTypeString: o?.boonTypeString ?? null,
      RARITY_CID: o?.RARITY_CID ?? null,
      // add other whitelisted fields if needed
    }));
  } catch {
    return [];
  }
}
