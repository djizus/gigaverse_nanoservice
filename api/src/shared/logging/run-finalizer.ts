import { DatabaseService } from '../../infrastructure/database/database.service';
import { RunLogger } from './run-logger';

export interface SessionCompletionData {
  completedRuns: number;
  totalRuns: number;
  [key: string]: any;
}

export class RunFinalizer {
  constructor(private db: DatabaseService, private logger?: RunLogger) {}

  async completeSession(runId: string, data: SessionCompletionData, opts?: { emitRunCompleted?: boolean }) {
    await this.db.updateDungeonRun(runId, {
      completed_at: new Date().toISOString(),
      completed_runs: data.completedRuns,
      status: 'completed',
    });
    if (this.logger) {
      if (opts?.emitRunCompleted) {
        await this.logger.emit('run_completed', `Session completed: ${data.completedRuns}/${data.totalRuns}`, { status: 'completed', ...data });
      }
      await this.logger.emit('all_runs_completed', `All runs completed ${data.completedRuns}/${data.totalRuns}`, data);
    }
  }

  async failSession(runId: string, message: string, extra?: any) {
    await this.db.updateDungeonRun(runId, { status: 'error' });
    if (this.logger) await this.logger.emit('error', message, extra);
  }

  async completeRunLog(runLogId: string, summary: { status: 'completed' | 'died'; [k: string]: any }) {
    await this.db.updateRunLog(runLogId, {
      status: summary.status,
      end_time: new Date().toISOString(),
      ...summary,
    });
    if (this.logger) await this.logger.emit('run_completed', `Run ${summary.status}`, summary);
  }

  async errorRunLog(runLogId: string, message: string, update?: Record<string, any>, extra?: any) {
    if (this.logger) await this.logger.emit('error', message, extra);
    await this.db.updateRunLog(runLogId, { status: 'error', error_message: message, end_time: new Date().toISOString(), ...(update || {}) });
  }
}
