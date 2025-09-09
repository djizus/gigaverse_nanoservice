import { DatabaseService } from '../../infrastructure/database/database.service';

type Decision = 'move' | 'loot' | 'slot' | 'signal';

function mapDecisionToEvent(decision: Decision): string {
  switch (decision) {
    case 'move': return 'agent_decision_move';
    case 'loot': return 'agent_decision_loot';
    case 'slot': return 'agent_decision_fishing';
    case 'signal': return 'agent_decision_signal';
  }
}

export class RunLogger {
  constructor(private db: DatabaseService, private runId: string, private runLogId: string | null) {}

  async emit(type: string, message: string, data?: any) {
    return this.db.createRunEvent({
      dungeon_run_id: this.runId,
      run_log_id: this.runLogId,
      event_type: type,
      message,
      event_data: data,
    });
  }

  async decisionAttempt(decision: Decision, attempt: number, max: number, detail: string, data?: any) {
    const type = mapDecisionToEvent(decision);
    const message = `Agent ${decision} decision (attempt ${attempt}/${max}): ${detail}`;
    return this.emit(type, message, data);
  }

  async decisionError(decision: Decision, attempt: number, max: number, error: unknown, data?: any) {
    const message = `Agent ${decision} parsing error (attempt ${attempt}/${max})`;
    return this.emit('agent_error', message, { ...(data || {}), error: String(error) });
  }
}
