// No longer using common game activity types - using direct Gigaverse integration
import { 
  GigaverseDungeonState, 
  GigaverseMemory,
  Player,
  LootOption,
  GameItemBalanceChange
} from '../gigaverse/gigaverse.types';

// Dungeon request interface with Gigaverse parameters
export interface DungeonRequest {
  context: string; // Instructions to give to the agent for decision making
  playerAddress: string; // Player wallet address
  gigaverseToken: string; // Authentication token for Gigaverse API
  totalRuns: number; // Total number of runs to complete
  dungeonId: number; // The dungeon ID to enter (e.g., 1 for basic dungeon)
  isJuiced?: boolean; // Whether to use juice for enhanced rewards
  consumables?: any[]; // Consumables to use in the run
  gearInstanceIds?: string[]; // Gear instance IDs to equip
  llmModel?: string; // Optional LLM model override for this run
}

// Legacy types removed - now using real-time database approach with DungeonRunResponse

// Re-export Gigaverse types for compatibility
export type { 
  GigaverseDungeonState,
  GigaverseMemory,
  Player,
  LootOption,
  GameItemBalanceChange 
};


// New real-time response - returned immediately
export interface DungeonRunResponse {
  runId: string;
  status: string;
  message: string;
}
