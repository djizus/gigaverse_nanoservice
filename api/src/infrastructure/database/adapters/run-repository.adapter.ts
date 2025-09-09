import { DatabaseService } from '../../database/database.service';
import { RunRepositoryPort } from '../../../shared/ports/run-repository.port';
import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput } from '../../database/types';

export class RunRepositoryAdapter implements RunRepositoryPort {
  constructor(private db: DatabaseService) {}

  async createRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<SummaryRun> {
    const res = await this.db.createDungeonRun(input, opts);
    if (!res.success || !res.data) throw new Error(res.error || 'createRun failed');
    return res.data;
  }

  async updateRun(id: string, input: UpdateDungeonRunInput): Promise<SummaryRun> {
    const res = await this.db.updateDungeonRun(id, input);
    if (!res.success || !res.data) throw new Error(res.error || 'updateRun failed');
    return res.data;
  }

  async getRun(id: string): Promise<SummaryRun> {
    const res = await this.db.getDungeonRun(id);
    if (!res.success || !res.data) throw new Error(res.error || 'getRun failed');
    return res.data;
  }

  async setRunMeta(id: string, meta: Record<string, any>): Promise<SummaryRun> {
    const res = await this.db.setRunMeta(id, meta);
    if (!res.success || !res.data) throw new Error(res.error || 'setRunMeta failed');
    return res.data;
  }

  async listRuns(opts?: { status?: SummaryRun['status'][]; limit?: number; serviceId?: string; developer?: string }): Promise<SummaryRun[]> {
    const res = await this.db.listRuns(opts || {});
    if (!res.success || !res.data) throw new Error(res.error || 'listRuns failed');
    return res.data;
  }

  async getActiveRunForPlayer(playerAddress: string): Promise<SummaryRun | null> {
    const res = await this.db.getActiveRunForPlayer(playerAddress);
    if (!res.success) throw new Error(res.error || 'getActiveRunForPlayer failed');
    return res.data || null;
  }

  async completeRun(dungeonRunId: string, completedRuns: number): Promise<void> {
    await this.db.completeDungeonRun(dungeonRunId, completedRuns);
  }

  async failRun(dungeonRunId: string, error: string): Promise<void> {
    await this.db.failDungeonRun(dungeonRunId, error);
  }

  async abortRun(dungeonRunId: string, reason: string): Promise<void> {
    await this.db.abortDungeonRun(dungeonRunId, reason);
  }

  async getRunComplete(dungeonRunId: string): Promise<{ summary: SummaryRun; details: SummaryDetail[] }> {
    const res = await this.db.getDungeonRunComplete(dungeonRunId);
    if (!res.success || !res.data) throw new Error(res.error || 'getRunComplete failed');
    return res.data;
  }
}

