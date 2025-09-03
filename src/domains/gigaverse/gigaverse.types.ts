// Gigaverse API Types based on real API responses
// Follows patterns from ~/fun/client/src/games/gigaverse/client/types/

export interface PlayerStats {
  startingATK: number;
  startingDEF: number;
  currentATK: number;
  currentDEF: number;
  currentCharges: number;
  maxCharges: number;
}

export interface Health {
  current: number;
  starting: number;
  currentMax: number;
  startingMax: number;
}

export interface Shield {
  current: number;
  starting: number;
  currentMax: number;
  startingMax: number;
}

export interface Equipment {
  docId: string;
  RARITY_CID: number;
  UINT256_CID: number;
  UINT256_CID_array: (number | null)[];
  selectedVal1: number;
  selectedVal2: number;
  boonTypeString: string;
}

export interface ActiveEffect {
  triggerType: string;
  effects: Array<{
    type: string;
    amount: number;
  }>;
  playerType: string;
}

export interface Player {
  id: string;
  rock: PlayerStats;
  paper: PlayerStats;
  scissor: PlayerStats;
  health: Health;
  shield: Shield;
  equipment: Equipment[];
  lastMove: string;
  thisPlayerWin: boolean;
  otherPlayerWin: boolean;
  activeEffects: ActiveEffect[];
  statusEffects: any[];
  _id: string;
}

export interface LootOption {
  docId: string;
  RARITY_CID: number;
  UINT256_CID: number;
  UINT256_CID_array: (number | null)[];
  selectedVal1: number;
  selectedVal2: number;
  boonTypeString: string;
}

export interface DungeonRun {
  _id: string;
  DUNGEON_ID_CID: number;
  userId: string;
  players: Player[];
  lootPhase: boolean;
  version: number;
  lootOptions: LootOption[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface DungeonEntity {
  _id: string;
  docId: string;
  data: { v: number };
  COMPLETE_CID: boolean;
  LEVEL_CID: number;
  GAME_ITEM_ID_CID_array: any[];
  ID_CID: string;
  PLAYER_CID: string;
  ROOM_NUM_CID: number;
  NOOB_TOKEN_CID: number;
  DUNGEON_ID_CID: number;
  ENEMY_CID: number;
  GEAR_CID_array: string[];
  TIER_CID: number;
  IS_JUICED_CID: boolean;
  MULTIPLIER_CID: number;
  WEEK_CID: number;
  DAY_CID: number;
  DAY_OF_WEEK_CID: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GameEvent {
  type: string;
  value?: any;
  playerId?: number;
  batch?: number;
  data: Record<string, any>;
}

export interface GameItemBalanceChange {
  id: number;
  amount: number;
  gearInstanceId: string;
  rarity: number;
}

export interface GigaverseApiResponse {
  success: boolean;
  message: string;
  data: {
    run: DungeonRun;
    entity: DungeonEntity;
    events?: GameEvent[];
  };
  gameItemBalanceChanges?: GameItemBalanceChange[];
  actionToken: number | string;
}

// Request payload types
export interface StartRunPayload {
  action: "start_run";
  actionToken: string;
  dungeonId: number;
  data: {
    consumables: any[];
    itemId: number;
    index: number;
    isJuiced: boolean;
    gearInstanceIds: string[];
  };
}

export interface MoveActionPayload {
  action: "rock" | "paper" | "scissor";
  actionToken: string | number;
  dungeonId: number;
  data: {
    consumables: any[];
    itemId: number;
    index: number;
    isJuiced: boolean;
    gearInstanceIds: string[];
  };
}

export interface LootActionPayload {
  action: "loot_one" | "loot_two" | "loot_three" | "loot_four";
  actionToken: string | number;
  dungeonId: number;
  data: {
    consumables: any[];
    itemId: number;
    index: number;
    isJuiced: boolean;
    gearInstanceIds: string[];
  };
}

export type GigaverseAction = StartRunPayload | MoveActionPayload | LootActionPayload;

// State tracking for agent memory
export interface GigaverseDungeonState {
  currentDungeon: number;
  currentRoom: number;
  currentEnemy: number;
  player: Player;
  enemy: Player;
  lootPhase: boolean;
  lootOptions: LootOption[];
  lastBattleResult: "win" | "lose" | "draw" | null;
  actionToken: string | number;
  isComplete: boolean;
}

// Agent memory interface
export interface GigaverseMemory {
  playerAddress: string;
  gigaverseToken: string;
  dungeonId: number;
  consumables: any[];
  gearInstanceIds: string[];
  isJuiced: boolean;
  currentRun: number;
  totalRuns: number;
  completedRuns: GigaverseDungeonState[];
  currentDungeonState?: GigaverseDungeonState;
  totalRewards: {
    itemsGained: number;
    battlesWon: number;
    battlesLost: number;
    roomsCleared: number;
  };
  lastActionResult: string;
}

// Configuration interface
export interface GigaverseConfig {
  apiBaseUrl: string;
  maxRetries: number;
  retryDelayMs: number;
  actionTimeoutMs: number;
}