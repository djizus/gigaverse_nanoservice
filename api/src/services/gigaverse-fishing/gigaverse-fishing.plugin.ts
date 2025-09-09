import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { FishingService } from '../../domains/fishing/fishing.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';

export class GigaverseFishingServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private fishing: FishingService;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = {
      developer,
      serviceId: 'gigaverse-fishing',
      name: 'Gigaverse Fishing Service',
      version: '0.1.0',
      summary: 'Starts Gigaverse fishing runs and emits basic events (MVP)',
      capabilities: ['runOrchestrator'],
      uiSchema: {
        fields: [
          { id: 'playerAddress', label: 'Player Address', type: 'text', required: true },
          { id: 'gigaverseToken', label: 'Gigaverse Token', type: 'textarea', required: true },
          { id: 'runType', label: 'Run Type', type: 'select', required: true, options: ['small','normal','big'], default: 'normal' },
          { id: 'totalRuns', label: 'Runs', type: 'number', required: true, min: 1, max: 100, default: 1 },
          { id: 'llmModel', label: 'Model (optional)', type: 'text' },
          { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: false, default: 'Fishing Protocol:\nTurn 1: play wide coverage (8–9 cells) to identify pattern.\nTurns 2+: predict path and play precise cards until capture.\nReturn only a CSV of up to 3 card indices from your current hand.' }
        ]
      }
    };
    this.db = opts.database;
    this.fishing = new FishingService(this.db, opts.agent);
  }

  async init() {}
  async health() { return { ok: true }; }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        // TODO[orchestrator-mapping]:
        // - Create/ensure a per-service orchestrator agent (e.g., "Fishing Orchestrator")
        // - Ensure a session and persist { agentId, sessionId } into run.meta via DatabaseService
        // - Surface { agentId, sessionId } in the HTTP response
        const runType = String(data?.runType || '').toLowerCase();
        if (!['small','normal','big'].includes(runType)) throw new Error('runType must be small|normal|big');
        if (!data?.playerAddress) throw new Error('playerAddress required');
        if (!data?.gigaverseToken) throw new Error('gigaverseToken required');
        const totalRuns = Number(data?.totalRuns || 1);
        const res = await this.fishing.startRuns({
          playerAddress: data.playerAddress,
          gigaverseToken: data.gigaverseToken,
          runType: runType as any,
          totalRuns,
          llmModel: data?.llmModel,
          user_instructions: data?.user_instructions
        });
        return res;
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
