import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../config/env.config';
import { logError, logSuccess, formatError } from '../../shared/utils/error.utils';
import {
  DungeonRun,
  RunLog,
  RunEvent,
  CreateDungeonRunInput,
  CreateRunLogInput,
  CreateRunEventInput,
  UpdateDungeonRunInput,
  UpdateRunLogInput,
  DatabaseResult,
  EventType
} from './types';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey);
    logSuccess('Database', 'Service initialized');
  }

  // ===== DUNGEON RUNS =====
  
  async createDungeonRun(input: CreateDungeonRunInput): Promise<DatabaseResult<DungeonRun>> {
    try {
      const { data, error } = await this.supabase
        .from('dungeon_runs')
        .insert([input])
        .select()
        .single();

      if (error) {
        logError({ operation: 'Create dungeon run', module: 'Database' }, error);
        return { success: false, error: error.message };
      }

      logSuccess('Database', 'Created dungeon run', { runId: data.id });
      return { success: true, data };
    } catch (error) {
      logError({ operation: 'Create dungeon run', module: 'Database' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  async updateDungeonRun(id: string, input: UpdateDungeonRunInput): Promise<DatabaseResult<DungeonRun>> {
    try {
      const { data, error } = await this.supabase
        .from('dungeon_runs')
        .update(input)
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

  async getDungeonRun(id: string): Promise<DatabaseResult<DungeonRun>> {
    try {
      const { data, error } = await this.supabase
        .from('dungeon_runs')
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

  async getActiveRunForPlayer(playerAddress: string): Promise<DatabaseResult<DungeonRun | null>> {
    try {
      // Check for ANY active runs for this player (regardless of dungeon type)
      // Since Gigaverse only allows one action at a time
      // BUT exclude runs older than 5 minutes to prevent permanent lockout from crashed agents
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('dungeon_runs')
        .select('*')
        .eq('player_address', playerAddress)
        .in('status', ['started', 'processing'])
        .gte('created_at', fiveMinutesAgo) // Only consider runs from last 5 minutes
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

  async createRunLog(input: CreateRunLogInput): Promise<DatabaseResult<RunLog>> {
    try {
      const { data, error } = await this.supabase
        .from('run_logs')
        .insert([input])
        .select()
        .single();

      if (error) {
        console.error('Failed to create run log:', error);
        return { success: false, error: error.message };
      }

      logSuccess('Database', 'Created run log', { logId: data.id, runNumber: data.run_number });
      return { success: true, data };
    } catch (error) {
      logError({ operation: 'Create run log', module: 'Database' }, error);
      return { success: false, error: formatError(error) };
    }
  }

  async updateRunLog(id: string, input: UpdateRunLogInput): Promise<DatabaseResult<RunLog>> {
    try {
      const { data, error } = await this.supabase
        .from('run_logs')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update run log:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Database error updating run log:', error);
      return { success: false, error: String(error) };
    }
  }

  async getRunLogsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<RunLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('run_logs')
        .select('*')
        .eq('dungeon_run_id', dungeonRunId)
        .order('run_number', { ascending: true });

      if (error) {
        console.error('Failed to get run logs:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Database error getting run logs:', error);
      return { success: false, error: String(error) };
    }
  }

  // ===== RUN EVENTS =====

  async createRunEvent(input: CreateRunEventInput): Promise<DatabaseResult<RunEvent>> {
    try {
      const { data, error } = await this.supabase
        .from('run_events')
        .insert([{
          ...input,
          event_data: input.event_data || {}
        }])
        .select()
        .single();

      if (error) {
        console.error('Failed to create run event:', error);
        return { success: false, error: error.message };
      }

      // Log the event for debugging
      console.log(`📡 Event logged: ${input.event_type} - ${input.message}`);
      
      return { success: true, data };
    } catch (error) {
      console.error('Database error creating run event:', error);
      return { success: false, error: String(error) };
    }
  }

  async getRunEventsByDungeonRun(dungeonRunId: string): Promise<DatabaseResult<RunEvent[]>> {
    try {
      const { data, error } = await this.supabase
        .from('run_events')
        .select('*')
        .eq('dungeon_run_id', dungeonRunId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to get run events:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Database error getting run events:', error);
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
    const result = await this.updateDungeonRun(dungeonRunId, {
      completed_runs: completedRuns,
      status: 'completed',
      completed_at: new Date().toISOString()
    });

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
    const result = await this.updateDungeonRun(dungeonRunId, {
      status: 'failed'
    });

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
        .from('dungeon_runs')
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
        await this.updateDungeonRun(run.id, {
          status: 'failed'
        });

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
    dungeonRun: DungeonRun;
    runLogs: RunLog[];
    events: RunEvent[];
  }>> {
    try {
      const [dungeonRunResult, runLogsResult, eventsResult] = await Promise.all([
        this.getDungeonRun(dungeonRunId),
        this.getRunLogsByDungeonRun(dungeonRunId),
        this.getRunEventsByDungeonRun(dungeonRunId)
      ]);

      if (!dungeonRunResult.success) {
        return { success: false, error: dungeonRunResult.error };
      }

      return {
        success: true,
        data: {
          dungeonRun: dungeonRunResult.data!,
          runLogs: runLogsResult.data || [],
          events: eventsResult.data || []
        }
      };
    } catch (error) {
      logError({ operation: 'Get complete dungeon run', module: 'Database', details: { dungeonRunId } }, error);
      return { success: false, error: formatError(error) };
    }
  }
}