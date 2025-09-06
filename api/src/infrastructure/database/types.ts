// Simplified database types for single-table summaries (run_summaries_simple)

export interface SummaryRun {
  id: string;
  player_address: string;
  context: string;
  llm_model: string;
  total_runs: number;
  completed_runs: number;
  dungeon_id: number;
  is_juiced: boolean;
  consumables: any[];
  gear_instance_ids: any[];
  status: 'started' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  details?: SummaryDetail[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SummaryDetail {
  event_type: string;
  message: string;
  event_data?: Record<string, any>;
  timestamp: string;
  run_log_id?: string | null;
}

export interface CreateDungeonRunInput {
  player_address: string;
  context: string;
  llm_model?: string;
  total_runs: number;
  dungeon_id: number;
  is_juiced?: boolean;
  consumables?: any[];
  gear_instance_ids?: any[];
}

export interface UpdateDungeonRunInput {
  completed_runs?: number;
  status?: SummaryRun['status'];
  completed_at?: string;
  error_message?: string | null;
}

export interface DungeonRunResponse {
  runId: string;
  status: string;
  message: string;
}

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
