import { SummaryRun, SummaryDetail, CreateDungeonRunInput, UpdateDungeonRunInput } from '../../infrastructure/database/types';

export interface RunRepositoryPort {
  createRun(input: CreateDungeonRunInput, opts?: { serviceId?: string; developer?: string; meta?: Record<string, any> }): Promise<SummaryRun>;
  updateRun(id: string, input: UpdateDungeonRunInput): Promise<SummaryRun>;
  getRun(id: string): Promise<SummaryRun>;
  setRunMeta(id: string, meta: Record<string, any>): Promise<SummaryRun>;
  listRuns(opts?: { status?: SummaryRun['status'][]; limit?: number; serviceId?: string; developer?: string }): Promise<SummaryRun[]>;
  getActiveRunForPlayer(playerAddress: string): Promise<SummaryRun | null>;
  completeRun(dungeonRunId: string, completedRuns: number): Promise<void>;
  failRun(dungeonRunId: string, error: string): Promise<void>;
  abortRun(dungeonRunId: string, reason: string): Promise<void>;
  getRunComplete(dungeonRunId: string): Promise<{ summary: SummaryRun; details: SummaryDetail[] }>;
}

