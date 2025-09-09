import { SupabaseConfig } from '../config/env.config';
import { logError, logSuccess, formatError } from '../../shared/utils/error.utils';
import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput, DatabaseResult } from './types';
import { IDatabaseAdapter } from './adapter.interface';
import { MemoryAdapter } from './adapters/memory.adapter';
import { SupabaseAdapter } from './adapters/supabase.adapter';

export class DatabaseService {
  private adapter: IDatabaseAdapter;

  constructor(config: SupabaseConfig, adapter?: IDatabaseAdapter) {
    const useMemory = process.env.DAYDREAMS_USE_MEMORY === 'true';
    this.adapter = adapter || (useMemory ? new MemoryAdapter() : new SupabaseAdapter(config));
    logSuccess('Database', `Service initialized using ${useMemory ? 'memory' : 'supabase'} adapter`);
  }

  // ===== DUNGEON RUNS =====
  async createDungeonRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<DatabaseResult<SummaryRun>> {
    return this.adapter.createRun(input, opts);
  }

  async updateDungeonRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<SummaryRun>> {
    return this.adapter.updateRun(id, input);
  }

  async getDungeonRun(id: string): Promise<DatabaseResult<SummaryRun>> {
    return this.adapter.getRun(id);
  }

  async setRunMeta(id: string, meta: Record<string, any>): Promise<DatabaseResult<SummaryRun>> {
    return this.adapter.setRunMeta(id, meta);
  }

  async listRuns(opts: { status?: SummaryRun['status'][], limit?: number, serviceId?: string, developer?: string } = {}): Promise<DatabaseResult<SummaryRun[]>> {
    return this.adapter.listRuns(opts);
  }

  async getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<SummaryRun | null>> {
    return this.adapter.getActiveRunForPlayer(playerAddress);
  }

  // ===== RUN LOGS =====
  async createRunLog(input: any): Promise<DatabaseResult<any>> {
    return this.adapter.createRunLog(input);
  }

  async updateRunLog(id: string, input: any): Promise<DatabaseResult<any>> {
    return this.adapter.updateRunLog(id, input);
  }

  async getRunLogsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<any[]>> {
    return this.adapter.getRunLogsByDungeonRun(dungeonRunId);
  }

  // ===== RUN EVENTS =====
  async createRunEvent(input: { dungeon_run_id: string; run_log_id: string | null; event_type: any; event_data?: Record<string, any>; message: string; }): Promise<DatabaseResult<any>> {
    return this.adapter.createEvent(input as any);
  }

  async getRunEventsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<SummaryDetail[]>> {
    return this.adapter.getEvents(dungeonRunId);
  }

  // ===== UTILITY METHODS =====
  async logEvent(dungeonRunId: string, runLogId: string, eventType: any, message: string, eventData?: Record<string, any>): Promise<void> {
    const result = await this.createRunEvent({ dungeon_run_id: dungeonRunId, run_log_id: runLogId, event_type: eventType, message, event_data: eventData });
    if (!result.success) console.error(`Failed to log ${eventType} event:`, result.error);
  }

  async completeDungeonRun(dungeonRunId: string, completedRuns: number): Promise<void> {
    return this.adapter.completeRun(dungeonRunId, completedRuns);
  }

  async failDungeonRun(dungeonRunId: string, error: string): Promise<void> {
    return this.adapter.failRun(dungeonRunId, error);
  }

  async abortDungeonRun(dungeonRunId: string, reason: string): Promise<void> {
    return this.adapter.abortRun(dungeonRunId, reason);
  }

  async cleanupExpiredRuns(playerAddress: string): Promise<void> {
    return this.adapter.cleanupExpiredRuns(playerAddress);
  }

  async getDungeonRunComplete(dungeonRunId: string): Promise<DatabaseResult<{ summary: SummaryRun; details: SummaryDetail[] }>> {
    return this.adapter.getRunComplete(dungeonRunId);
  }
}
