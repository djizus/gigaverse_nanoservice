export type RunType = 'small' | 'normal' | 'big';

export interface FishingDeckCard {
  id: number;
  manaCost?: number;
  hitZones?: number[];
  critZones?: number[];
}

export interface FishingGameData {
  deckCardData?: FishingDeckCard[];
  playerMaxHp?: number;
  playerHp?: number;
  fishHp?: number;
  fishMaxHp?: number;
  fishPosition?: number[];
  previousFishPosition?: number[];
  hand?: number[]; // card ids currently in hand (server semantics)
}

export interface FishingStateResponse {
  gameState?: { data?: FishingGameData; [k: string]: any };
  [k: string]: any;
}

export interface PlayResultDoc {
  data?: FishingGameData;
  COMPLETE_CID?: boolean;
  SUCCESS_CID?: boolean;
}

