import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../config/env.config';
import { logError, logSuccess, formatError } from '../../shared/utils/error.utils';
import {
  SummaryRun,
  SummaryDetail,
  CreateDungeonRunInput,
  UpdateDungeonRunInput,
  DatabaseResult,
} from './types';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey);
    logSuccess('Database', 'Service initialized');
  }

  // ===== DUNGEON RUNS =====
  
  async createDungeonRun(input: CreateDungeonRunInput): Promise<DatabaseResult<SummaryRun>> {
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
      };

      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .insert([payload])
        .select()
        .single();

      if (error) {
        logError({ operation: 'Create dungeon run', module: 'Database' }, error);
        return { success: false, error: error.message };
      }

      logSuccess('Database', 'Created dungeon run', { runId: data.id });
      return { success: true, data: data as any };
    } catch (error) {
      logError({ operation: 'Create dungeon run', module: 'Database' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  async updateDungeonRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<SummaryRun>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update dungeon run:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Database error updating dungeon run:', error);
      return { success: false, error: String(error) };
    }
  }

  async getDungeonRun(id: string): Promise<DatabaseResult<SummaryRun>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to get dungeon run:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Database error getting dungeon run:', error);
      return { success: false, error: String(error) };
    }
  }

  async listRuns(opts: { status?: ('started'|'processing'|'completed'|'failed')[], limit?: number } = {}): Promise<DatabaseResult<SummaryRun[]>> {
    try {
      let query = this.supabase
        .from('run_summaries_simple')
        .select('*')
        .order('created_at', { ascending: false });
      if (opts.status && opts.status.length) {
        query = query.in('status', opts.status);
      }
      if (opts.limit && opts.limit > 0) {
        query = query.limit(opts.limit);
      } else {
        query = query.limit(50);
      }
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<SummaryRun | null>> {
    try {
      // Check for ANY active runs for this player (regardless of dungeon type)
      // Since Gigaverse only allows one action at a time
      // BUT exclude runs older than 5 minutes to prevent permanent lockout from crashed agents
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('player_address', playerAddress)
        .in('status', ['started', 'processing'])
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logError({ operation: 'Get active run for player', module: 'Database', details: { playerAddress } }, error);
        return { success: false, error: error.message };
      }

      // If no active run found, check if there are any expired runs to clean up
      if (!data) {
        await this.cleanupExpiredRuns(playerAddress);
      }

      return { success: true, data };
    } catch (error) {
      logError({ operation: 'Get active run for player', module: 'Database' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  // ===== RUN LOGS =====

  async createRunLog(input: any): Promise<DatabaseResult<any>> {
    // No-op DB: synthesize a run log entry and append to details
    try {
      const id = (globalThis as any).crypto?.randomUUID?.() || String(Date.now());
      const runLog: RunLog = {
        id,
        dungeon_run_id: (input as any).dungeon_run_id || 'unknown',
        run_number: input.run_number,
        status: 'started',
        rooms_cleared: 0,
        battles_won: 0,
        battles_lost: 0,
        items_gained: 0,
        moves: [],
        loot_choices: [],
        player_stats: input.player_stats || null,
        start_time: new Date().toISOString(),
        end_time: null,
        error_message: null,
      } as any;
      return { success: true, data: runLog };
    } catch (error) {
      logError({ operation: 'Create run log', module: 'Database' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  async updateRunLog(id: string, input: any): Promise<DatabaseResult<any>> {
    // No-op DB: pretend successful update; details are tracked via createRunEvent
    try {
      const updated: RunLog = {
        id,
        dungeon_run_id: 'unknown',
        run_number: 0,
        status: input.status || 'started',
        rooms_cleared: input.rooms_cleared || 0,
        battles_won: input.battles_won || 0,
        battles_lost: input.battles_lost || 0,
        items_gained: input.items_gained || 0,
        moves: input.moves || [],
        loot_choices: input.loot_choices || [],
        player_stats: input.player_stats || null,
        start_time: new Date().toISOString(),
        end_time: input.end_time || null,
        error_message: input.error_message || null,
      } as any;
      return { success: true, data: updated };
    } catch (error) {
      console.error('Database error updating run log:', error);
      return { success: false, error: String(error) };
    }
  }

  async getRunLogsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<any[]>> {
    // No dedicated run logs table in simplified schema
    return { success: true, data: [] };
  }

  // ===== RUN EVENTS =====

  async createRunEvent(input: { dungeon_run_id: string; run_log_id: string | null; event_type: string; event_data?: Record<string, any>; message: string; }): Promise<DatabaseResult<any>> {
    // Publish to in-memory event bus for SSE (best-effort), and best-effort append to summaries
    try {
      const { publish } = await import('../events/event-bus');
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

      // Try appending to run_summaries_simple.details (ignore errors)
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

      console.log(`📡 Event logged: ${input.event_type} - ${input.message}`);
      return { success: true, data: {
        id: crypto.randomUUID?.() || String(Date.now()),
        dungeon_run_id: input.dungeon_run_id,
        run_log_id: input.run_log_id,
        event_type: input.event_type as any,
        event_data: input.event_data || {},
        message: input.message,
        timestamp: evt.timestamp,
      } as any };
    } catch (error) {
      console.error('Database error creating run event:', error);
      return { success: false, error: String(error) };
    }
  }

  async getRunEventsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<SummaryDetail[]>> {
    try {
      const { data, error } = await this.supabase
        .from('run_summaries_simple')
        .select('details')
        .eq('id', dungeonRunId)
        .single();
      if (error) return { success: false, error: error.message };
      const events: RunEvent[] = (data?.details || []).map((d: any) => ({
        id: (globalThis as any).crypto?.randomUUID?.() || String(Date.now()),
        dungeon_run_id: dungeonRunId,
        run_log_id: d.run_log_id || null,
        event_type: d.event_type,
        event_data: d.event_data || {},
        message: d.message || '',
        timestamp: d.timestamp || new Date().toISOString(),
      }));
      return { success: true, data: events };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Log a real-time event - this is the main method used throughout dungeon execution
   */
  async logEvent(
    dungeonRunId: string, 
    runLogId: string, 
    eventType: EventType, 
    message: string, 
    eventData?: Record<string, any>
  ): Promise<void> {
    const result = await this.createRunEvent({
      dungeon_run_id: dungeonRunId,
      run_log_id: runLogId,
      event_type: eventType,
      message,
      event_data: eventData
    });

    if (!result.success) {
      console.error(`Failed to log ${eventType} event:`, result.error);
    }
  }

  /**
   * Mark dungeon run as completed
   */
  async completeDungeonRun(dungeonRunId: string, completedRuns: number): Promise<void> {
    const result = await this.supabase
      .from('run_summaries_simple')
      .update({ completed_runs: completedRuns, status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', dungeonRunId)
      .select()
      .single();

    if (!result.success) {
      logError({ operation: 'Complete dungeon run', module: 'Database', details: { dungeonRunId } }, result.error);
    } else {
      logSuccess('Database', 'Dungeon run completed', { dungeonRunId, completedRuns });
    }
  }

  /**
   * Mark dungeon run as failed
   */
  async failDungeonRun(dungeonRunId: string, error: string): Promise<void> {
    const result = await this.supabase
      .from('run_summaries_simple')
      .update({ status: 'failed', error_message: error })
      .eq('id', dungeonRunId)
      .select()
      .single();

    // Log error event (session-level, no specific run log)
    await this.createRunEvent({
      dungeon_run_id: dungeonRunId,
      run_log_id: null, // null for session-level events
      event_type: 'error',
      message: `Dungeon run failed: ${error}`,
      event_data: { error }
    });

    if (!result.success) {
      console.error('Failed to mark dungeon run as failed:', result.error);
    } else {
      console.log(`❌ Dungeon run ${dungeonRunId} failed: ${error}`);
    }
  }

  /**
   * Clean up expired runs (older than 5 minutes and still active)
   * Prevents permanent player lockout from crashed agents
   */
  async cleanupExpiredRuns(playerAddress: string): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Find expired active runs
      const { data: expiredRuns, error } = await this.supabase
        .from('run_summaries_simple')
        .select('*')
        .eq('player_address', playerAddress)
        .in('status', ['started', 'processing'])
        .lt('created_at', fiveMinutesAgo);

      if (error) {
        console.error('Failed to find expired runs:', error);
        return;
      }

      if (!expiredRuns || expiredRuns.length === 0) {
        return; // No expired runs to clean up
      }

      console.log(`🧹 Cleaning up ${expiredRuns.length} expired runs for player ${playerAddress}`);

      // Mark each expired run as failed and log timeout events
      for (const run of expiredRuns) {
        // Update run status to failed
        await this.supabase
          .from('run_summaries_simple')
          .update({ status: 'failed' })
          .eq('id', run.id);

        // Log timeout event
        await this.createRunEvent({
          dungeon_run_id: run.id,
          run_log_id: null, // null for session-level events
          event_type: 'error',
          message: `Run timed out after 5 minutes - likely due to agent crash. Auto-marked as failed to prevent player lockout.`,
          event_data: { 
            reason: 'timeout',
            timeoutMinutes: 5,
            originalStatus: run.status,
            createdAt: run.created_at
          }
        });

        console.log(`⏰ Run ${run.id} marked as failed due to 5-minute timeout`);
      }
    } catch (error) {
      console.error('Error during expired runs cleanup:', error);
    }
  }

  /**
   * Get complete dungeon run data with logs and events
   */
  async getDungeonRunComplete(dungeonRunId: string): Promise<DatabaseResult<{
    summary: SummaryRun;
    details: SummaryDetail[];
  }>> {
    try {
      const [summaryRes, detailsRes] = await Promise.all([
        this.getDungeonRun(dungeonRunId),
        this.getRunEventsByDungeonRun(dungeonRunId)
      ]);

      if (!summaryRes.success) return { success: false, error: summaryRes.error };

      return { success: true, data: { summary: summaryRes.data!, details: detailsRes.data || [] } };
    } catch (error) {
      logError({ operation: 'Get complete dungeon run', module: 'Database', details: { dungeonRunId } }, error);
      return { success: false, error: formatError(error) };
    }
  }
}
