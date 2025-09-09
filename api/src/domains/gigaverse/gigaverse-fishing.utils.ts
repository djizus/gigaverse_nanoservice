import { RunType } from './gigaverse-fishing.types';

export function mapRunTypeToNodeId(runType: RunType): string {
  switch (runType) {
    case 'small': return '0';
    case 'normal': return '1';
    case 'big': return '2';
    default: return '0';
  }
}

export function clampSlot(slot: number, handLength: number): number {
  if (!Number.isFinite(slot) || handLength <= 0) return 1;
  return Math.max(1, Math.min(handLength, Math.trunc(slot)));
}

export function computeProgress(fishHp?: number, fishMaxHp?: number): number | null {
  if (typeof fishHp !== 'number' || typeof fishMaxHp !== 'number' || fishMaxHp <= 0) return null;
  const pct = Math.round(((fishMaxHp - fishHp) / fishMaxHp) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function isComplete(doc: any): boolean {
  return !!(doc?.COMPLETE_CID || doc?.SUCCESS_CID);
}

