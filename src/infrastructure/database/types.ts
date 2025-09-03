// Database types for Supabase tables

export interface DungeonRun {
  id: string;
  player_address: string;
  context: string;
  total_runs: number;
  completed_runs: number;
  dungeon_id: number;
  is_juiced: boolean;
  consumables: any[];
  gear_instance_ids: string[];
  status: 'started' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RunLog {
  id: string;
  dungeon_run_id: string;
  run_number: number;
  status: 'started' | 'processing' | 'completed' | 'died' | 'error';
  rooms_cleared: number;
  battles_won: number;
  battles_lost: number;
  items_gained: number;
  moves: string[];
  loot_choices: string[];
  player_stats: {
    startHP: number;
    endHP: number;
    maxHP: number;
  } | null;
  start_time: string;
  end_time: string | null;
  error_message: string | null;
}

export type EventType = 
  | 'run_started' 
  | 'room_entered' 
  | 'combat_move' 
  | 'battle_result'
  | 'loot_phase' 
  | 'loot_selected' 
  | 'room_cleared' 
  | 'run_completed'
  | 'all_runs_completed' 
  | 'error';

export interface RunEvent {
  id: string;
  dungeon_run_id: string;
  run_log_id: string;
  event_type: EventType;
  event_data: Record<string, any>;
  message: string;
  timestamp: string;
}

// Input types for creating records
export interface CreateDungeonRunInput {
  player_address: string;
  context: string;
  total_runs: number;
  dungeon_id: number;
  is_juiced?: boolean;
  consumables?: any[];
  gear_instance_ids?: string[];
}

export interface CreateRunLogInput {
  dungeon_run_id: string;
  run_number: number;
  player_stats?: {
    startHP: number;
    endHP: number;
    maxHP: number;
  };
}

export interface CreateRunEventInput {
  dungeon_run_id: string;
  run_log_id: string;
  event_type: EventType;
  event_data?: Record<string, any>;
  message: string;
}

// Update types
export interface UpdateDungeonRunInput {
  completed_runs?: number;
  status?: DungeonRun['status'];
  completed_at?: string;
}

export interface UpdateRunLogInput {
  status?: RunLog['status'];
  rooms_cleared?: number;
  battles_won?: number;
  battles_lost?: number;
  items_gained?: number;
  moves?: string[];
  loot_choices?: string[];
  player_stats?: RunLog['player_stats'];
  end_time?: string;
  error_message?: string;
}

// Response types for API
export interface DungeonRunResponse {
  runId: string;
  status: string;
  message: string;
}

// Database operation result
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}