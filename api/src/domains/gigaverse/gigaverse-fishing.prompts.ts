export function buildStrategyContext(userContext?: string) {
  const base = [
    'You are a fishing assistant for a grid-based mini-game.',
    'Decide exactly ONE slot number to play next from the current hand.',
    'Return a single integer only (1..N), where N = hand length. No extra text.',
    'Turn 1: prefer wide-coverage to probe fish movement. Later: predict and play precisely.',
  ].join(' ');
  return userContext ? `${userContext}\n${base}` : base;
}

export function composeFishingPrompt(ctx: {
  hand: number[];
  deck?: any;
  fishPos?: number[];
  prevFishPos?: number[];
}) {
  return [
    `Hand has ${Array.isArray(ctx.hand) ? ctx.hand.length : 0} card(s). Choose ONE slot (1..${Array.isArray(ctx.hand)?ctx.hand.length:0}).`,
    'Return only the slot number as an integer (e.g., 1).',
    'Deck:', JSON.stringify(ctx.deck || {}),
    'Hand:', JSON.stringify(ctx.hand || []),
    'FishPosition:', JSON.stringify(ctx.fishPos || []),
    'PreviousFishPosition:', JSON.stringify(ctx.prevFishPos || []),
  ].join('\n');
}

export function parseSlotFromText(text: string, handLength: number): number | null {
  const nums = Array.from(String(text || '').matchAll(/\d+/g)).map(m => parseInt(m[0], 10));
  const n = (nums && nums.length) ? nums[0] : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= handLength) return n;
  return null;
}
