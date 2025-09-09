import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseAdapter, EventType } from '../adapter.interface';
import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput, DatabaseResult } from '../types';
import { SupabaseConfig } from '../../config/env.config';
import { logError, logSuccess, formatError } from '../../../shared/utils/error.utils';
import { publish } from '../../events/event-bus';

export class SupabaseAdapter implements IDatabaseAdapter {
  private supabase: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey);
    logSuccess('Database(Supabase)', 'Adapter initialized');
  }

  async createRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<DatabaseResult<SummaryRun>> {
    try {
      const payload: any = {
        player_address: input.player_address,
        context: input.context,
        llm_model: input.llm_model || 'google-vertex/gemini-2.5-flash',
        total_runs: input.total_runs,
        dungeon_id: input.dungeon_id,
        is_juiced: input.is_juiced ?? false,
        consumables: input.consumables ?? [],
        gear_instance_ids: input.gear_instance_ids ?? [],
        status: 'started',
        service_id: opts?.serviceId || 'gigaverse',
        developer: opts?.developer || 'daydreams',
        meta: opts?.meta || {},
      };

      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .insert([payload])
        .select()
        .single();

      if (error) {
        logError({ operation: 'Create run', module: 'Database(Supabase)' }, error);
        return { success: false, error: error.message };
      }

      logSuccess('Database(Supabase)', 'Created run', { runId: data.id });
      return { success: true, data: data as any };
    } catch (error) {
      logError({ operation: 'Create run', module: 'Database(Supabase)' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  async updateRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<SummaryRun>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getRun(id: string): Promise<DatabaseResult<SummaryRun>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async listRuns(opts: { status?: SummaryRun['status'][]; limit?: number; serviceId?: string; developer?: string } = {}): Promise<DatabaseResult<SummaryRun[]>> {
    try {
      let query = this.supabase
        .from('run_summaries_simple')
        .select('*')
        .order('created_at', { ascending: false });
      if (opts.status && opts.status.length) query = query.in('status', opts.status);
      if (opts.serviceId) query = query.eq('service_id', opts.serviceId);
      if (opts.developer) query = query.eq('developer', opts.developer);
      query = query.limit(opts.limit && opts.limit > 0 ? opts.limit : 50);
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<SummaryRun | null>> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('player_address', playerAddress)
        .in('status', ['started', 'processing'])
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) await this.cleanupExpiredRuns(playerAddress);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatError(error) };
    }
  }

  async completeRun(dungeonRunId: string, completedRuns: number): Promise<void> {
    const { error } = await this.supabase
      .from('run_summaries_simple')
      .update({ completed_runs: completedRuns, status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', dungeonRunId);
    if (error) logError({ operation: 'Complete run', module: 'Database(Supabase)', details: { dungeonRunId } }, error.message || error);
    else logSuccess('Database(Supabase)', 'Run completed', { dungeonRunId, completedRuns });
  }

  async failRun(dungeonRunId: string, errorMsg: string): Promise<void> {
    const { error } = await this.supabase
      .from('run_summaries_simple')
      .update({ status: 'failed', error_message: errorMsg })
      .eq('id', dungeonRunId);
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: null, event_type: 'error', message: `Dungeon run failed: ${errorMsg}`, event_data: { error: errorMsg } });
    if (error) logError({ operation: 'Fail run', module: 'Database(Supabase)' }, error.message || error);
  }

  async abortRun(dungeonRunId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from('run_summaries_simple')
      .update({ status: 'aborted', error_message: reason })
      .eq('id', dungeonRunId);
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: null, event_type: 'error', message: `Run aborted: ${reason}`, event_data: { reason: 'aborted' } });
    if (error) logError({ operation: 'Abort run', module: 'Database(Supabase)' }, error.message || error);
  }

  async cleanupExpiredRuns(playerAddress: string): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: expiredRuns, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('player_address', playerAddress)
        .in('status', ['started', 'processing'])
        .lt('created_at', fiveMinutesAgo);
      if (error) return;
      if (!expiredRuns || expiredRuns.length === 0) return;
      for (const run of expiredRuns) {
        await this.supabase
          .from('run_summaries_simple')
          .update({ status: 'failed' })
          .eq('id', run.id);
        await this.createEvent({ dungeon_run_id: run.id, run_log_id: null, event_type: 'error', message: `Run timed out after 5 minutes - likely due to agent crash. Auto-marked as failed to prevent player lockout.`, event_data: { reason: 'timeout', timeoutMinutes: 5, originalStatus: run.status, createdAt: run.created_at } });
      }
    } catch {}
  }

  
  async setRunMeta(id: string, meta: Record<string, any>): Promise<DatabaseResult<SummaryRun>> {
    try {
      const { data: existing, error: e1 } = await this.supabase
        .from('run_summaries_simple')
        .select('meta')
        .eq('id', id)
        .single();
      if (e1) return { success: false, error: e1.message };
      const merged = { ...((existing?.meta as any) || {}), ...(meta||{}) };
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .update({ meta: merged })
        .eq('id', id)
        .select('*')
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data as any };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
async createRunLog(input: any): Promise<DatabaseResult<any>> {
    const id = crypto.randomUUID?.() || String(Date.now());
    const runLog = { id, dungeon_run_id: input.dungeon_run_id, run_number: input.run_number, status: 'started', rooms_cleared: 0, battles_won: 0, battles_lost: 0, items_gained: 0, moves: [], loot_choices: [], player_stats: null, start_time: new Date().toISOString(), end_time: null, error_message: null };
    return { success: true, data: runLog };
  }

  async updateRunLog(id: string, input: any): Promise<DatabaseResult<any>> {
    const updated = { id, ...input };
    return { success: true, data: updated };
  }

  async getRunLogsByDungeonRun(_dungeonRunId: string): Promise<DatabaseResult<any[]>> {
    return { success: true, data: [] };
  }

  async createEvent(input: { dungeon_run_id: string; run_log_id: string | null; event_type: EventType; event_data?: Record<string, any>; message: string; }): Promise<DatabaseResult<any>> {
    try {
      const evt = {
        version: 'v1',
        type: input.event_type,
        runId: input.dungeon_run_id,
        runLogId: input.run_log_id,
        timestamp: new Date().toISOString(),
        message: input.message,
        ...((input.event_data && typeof input.event_data === 'object') ? input.event_data : {}),
      };
      await publish(evt);

      try {
        const { data: existing } = await this.supabase
          .from('run_summaries_simple')
          .select('details')
          .eq('id', input.dungeon_run_id)
          .single();
        const details = Array.isArray(existing?.details) ? existing.details : [];
        details.push({ event_type: input.event_type, message: input.message, event_data: input.event_data || {}, timestamp: evt.timestamp });
        await this.supabase
          .from('run_summaries_simple')
          .update({ details })
          .eq('id', input.dungeon_run_id);
      } catch {}
      return { success: true, data: { id: crypto.randomUUID?.() || String(Date.now()), ...evt } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getEvents(dungeonRunId: string): Promise<DatabaseResult<SummaryDetail[]>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('details')
        .eq('id', dungeonRunId)
        .single();
      if (error) return { success: false, error: error.message };
      const events = (data?.details || []).map((d: any) => ({ event_type: d.event_type, message: d.message, event_data: d.event_data || {}, timestamp: d.timestamp })) as SummaryDetail[];
      return { success: true, data: events };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async logEvent(dungeonRunId: string, runLogId: string, eventType: EventType, message: string, eventData?: Record<string, any>): Promise<void> {
    await this.createEvent({ dungeon_run_id: dungeonRunId, run_log_id: runLogId, event_type: eventType, message, event_data: eventData });
  }

  async getRunComplete(dungeonRunId: string): Promise<DatabaseResult<{ summary: SummaryRun; details: SummaryDetail[] }>> {
    try {
      const [summaryRes, detailsRes] = await Promise.all([
        this.getRun(dungeonRunId),
        this.getEvents(dungeonRunId)
      ]);
      if (!summaryRes.success) return { success: false, error: summaryRes.error };
      return { success: true, data: { summary: summaryRes.data!, details: detailsRes.data || [] } };
    } catch (error) {
      return { success: false, error: formatError(error) };
    }
  }
}

