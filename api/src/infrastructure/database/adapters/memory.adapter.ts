import { IDatabaseAdapter, EventType } from '../adapter.interface';
import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput, DatabaseResult } from '../types';
import { publish } from '../../events/event-bus';

type RunId = string;

export class MemoryAdapter implements IDatabaseAdapter {
  private runs = new Map<RunId, SummaryRun>();
  private events = new Map<RunId, SummaryDetail[]>();

  async createRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<DatabaseResult<SummaryRun>> {
    const id = crypto.randomUUID?.() || String(Date.now());
    const now = new Date().toISOString();
    const run: SummaryRun = {
      id,
      player_address: input.player_address,
      context: input.context,
      llm_model: input.llm_model || 'google-vertex/gemini-2.5-flash',
      total_runs: input.total_runs,
      completed_runs: 0,
      dungeon_id: input.dungeon_id,
      is_juiced: !!input.is_juiced,
      consumables: input.consumables ?? [],
      gear_instance_ids: input.gear_instance_ids ?? [],
      status: 'started',
      error_message: null,
      details: [],
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    this.runs.set(id, run);
    this.events.set(id, []);
    return { success: true, data: run };
  }

  async updateRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<SummaryRun>> {
    const run = this.runs.get(id);
    if (!run) return { success: false, error: 'Run not found' };
    const updated: SummaryRun = { ...run, ...input, updated_at: new Date().toISOString() } as any;
    this.runs.set(id, updated);
    return { success: true, data: updated };
  }

  async getRun(id: string): Promise<DatabaseResult<SummaryRun>> {
    const run = this.runs.get(id);
    if (!run) return { success: false, error: 'Run not found' };
    return { success: true, data: run };
  }

  async listRuns(opts: { status?: SummaryRun['status'][]; limit?: number; serviceId?: string; developer?: string } = {}): Promise<DatabaseResult<SummaryRun[]>> {
    let list = Array.from(this.runs.values());
    if (opts.status && opts.status.length) list = list.filter(r => opts.status!.includes(r.status));
    list = list.sort((a,b) => (b.created_at.localeCompare(a.created_at)));
    if (opts.limit && opts.limit > 0) list = list.slice(0, opts.limit);
    return { success: true, data: list };
    }

  async getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<SummaryRun | null>> {
    const nowMinus5m = Date.now() - 5 * 60 * 1000;
    const active = Array.from(this.runs.values()).find(r => r.player_address === playerAddress && (r.status === 'started' || r.status === 'processing') && Date.parse(r.created_at) >= nowMinus5m);
    return { success: true, data: active || null };
  }

  async completeRun(dungeonRunId: string, completedRuns: number): Promise<void> {
    const run = this.runs.get(dungeonRunId);
    if (!run) return;
    run.completed_runs = completedRuns;
    run.status = 'completed';
    run.completed_at = new Date().toISOString();
    run.updated_at = new Date().toISOString();
    this.runs.set(dungeonRunId, run);
  }

  async failRun(dungeonRunId: string, error: string): Promise<void> {
    const run = this.runs.get(dungeonRunId);
    if (!run) return;
    run.status = 'failed';
    run.error_message = error;
    run.updated_at = new Date().toISOString();
    this.runs.set(dungeonRunId, run);
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: null, event_type: 'error', message: `Dungeon run failed: ${error}`, event_data: { error } });
  }

  async abortRun(dungeonRunId: string, reason: string): Promise<void> {
    const run = this.runs.get(dungeonRunId);
    if (!run) return;
    run.status = 'aborted';
    run.error_message = reason;
    run.updated_at = new Date().toISOString();
    this.runs.set(dungeonRunId, run);
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: null, event_type: 'error', message: `Run aborted: ${reason}`, event_data: { reason: 'aborted' } });
  }

  async cleanupExpiredRuns(_playerAddress: string): Promise<void> {
    // No-op for memory adapter
  }

  async createRunLog(input: any): Promise<DatabaseResult<any>> {
    const id = crypto.randomUUID?.() || String(Date.now());
    const runLog = { id, dungeon_run_id: input.dungeon_run_id, run_number: input.run_number, status: 'started', rooms_cleared: 0, battles_won: 0, battles_lost: 0, items_gained: 0, moves: [], loot_choices: [], player_stats: null, start_time: new Date().toISOString(), end_time: null, error_message: null };
    return { success: true, data: runLog };
  }

  async updateRunLog(id: string, input: any): Promise<DatabaseResult<any>> {
    // Memory adapter does not persist logs beyond events; return echo
    const updated = { id, ...input };
    return { success: true, data: updated };
  }

  async getRunLogsByDungeonRun(_dungeonRunId: string): Promise<DatabaseResult<any[]>> {
    return { success: true, data: [] };
  }

  async createEvent(input: { dungeon_run_id: string; run_log_id: string | null; event_type: EventType; event_data?: Record<string, any> | undefined; message: string; }): Promise<DatabaseResult<any>> {
    const evt = {
      version: 'v1',
      type: input.event_type,
      runId: input.dungeon_run_id,
      runLogId: input.run_log_id,
      timestamp: new Date().toISOString(),
      message: input.message,
      ...(input.event_data || {}),
    };
    await publish(evt);
    const details = this.events.get(input.dungeon_run_id) || [];
    details.push({ event_type: input.event_type, message: input.message, event_data: input.event_data || {}, timestamp: evt.timestamp, run_log_id: input.run_log_id || undefined });
    this.events.set(input.dungeon_run_id, details);
    return { success: true, data: { id: crypto.randomUUID?.() || String(Date.now()), ...evt } };
  }

  async getEvents(dungeonRunId: string): Promise<DatabaseResult<SummaryDetail[]>> {
    return { success: true, data: this.events.get(dungeonRunId) || [] };
  }

  async logEvent(dungeonRunId: string, runLogId: string, eventType: EventType, message: string, eventData?: Record<string, any>): Promise<void> {
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: runLogId, event_type: eventType, message, event_data: eventData });
  }

  async getRunComplete(dungeonRunId: string): Promise<DatabaseResult<{ summary: SummaryRun; details: SummaryDetail[] }>> {
    const run = this.runs.get(dungeonRunId);
    if (!run) return { success: false, error: 'Run not found' };
    const details = this.events.get(dungeonRunId) || [];
    return { success: true, data: { summary: run, details } };
  }
}

