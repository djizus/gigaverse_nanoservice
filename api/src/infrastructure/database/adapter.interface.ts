import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput, DatabaseResult } from './types';

export type EventType =
  | 'run_started'
  | 'room_entered'
  | 'combat_move'
  | 'battle_result'
  | 'loot_phase'
  | 'loot_selected'
  | 'agent_decision_move'
  | 'agent_decision_loot'
  | 'agent_decision_fishing'
  // Fishing events
  | 'fishing_started'
  | 'fishing_cards'
  | 'fishing_capture_progress'
  | 'run_completed'
  | 'all_runs_completed'
  | 'error';

export interface IDatabaseAdapter {
  // Runs
  createRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<DatabaseResult<SummaryRun>>;
  updateRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<SummaryRun>>;
  getRun(id: string): Promise<DatabaseResult<SummaryRun>>;
  // Merge partial meta into existing run.meta
  setRunMeta(id: string, meta: Record<string, any>): Promise<DatabaseResult<SummaryRun>>;
  listRuns(opts?: { status?: SummaryRun['status'][]; limit?: number; serviceId?: string; developer?: string; userId?: string }): Promise<DatabaseResult<SummaryRun[]>>;
  getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<SummaryRun | null>>;
  completeRun(dungeonRunId: string, completedRuns: number): Promise<void>;
  failRun(dungeonRunId: string, error: string): Promise<void>;
  abortRun(dungeonRunId: string, reason: string): Promise<void>;
  cleanupExpiredRuns(playerAddress: string): Promise<void>;

  // Logs
  createRunLog(input: any): Promise<DatabaseResult<any>>;
  updateRunLog(id: string, input: any): Promise<DatabaseResult<any>>;
  getRunLogsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<any[]>>;

  // Events
  createEvent(input: { dungeon_run_id: string; run_log_id: string | null; event_type: EventType; event_data?: Record<string, any>; message: string; }): Promise<DatabaseResult<any>>;
  getEvents(dungeonRunId: string): Promise<DatabaseResult<SummaryDetail[]>>;
  logEvent(dungeonRunId: string, runLogId: string, eventType: EventType, message: string, eventData?: Record<string, any>): Promise<void>;

  // Aggregates
  getRunComplete(dungeonRunId: string): Promise<DatabaseResult<{ summary: SummaryRun; details: SummaryDetail[] }>>;
}
