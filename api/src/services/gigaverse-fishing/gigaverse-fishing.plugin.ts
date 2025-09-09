import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { FishingService } from '../../domains/fishing/fishing.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { manifest as svcManifest, uiSchema, StartRunSchema, buildPorts, startRunOp } from '../../domains/gigaverse-fishing';
import { AgentService } from '../../daydreams/services/agent.service';

export class GigaverseFishingServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private fishing: FishingService;
  private agents?: AgentService;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService; agents?: AgentService }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = { ...svcManifest, developer, uiSchema };
    this.db = opts.database;
    this.fishing = new FishingService(this.db, opts.agent);
    this.agents = (opts as any).agents;
  }

  async init() {}
  async health() { return { ok: true }; }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        const parsed = StartRunSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues.map(i=>i.message).join('; '));
        if (!this.agents) {
          return this.fishing.startRuns(parsed.data as any);
        }
        const ports = buildPorts({ db: this.db, agents: this.agents, serviceName: 'Fishing Orchestrator', defaultModel: parsed.data.llmModel, orchestratorName: 'Fishing Orchestrator' });
        return startRunOp(this.db, this.fishing as any, { ensureAgent: ports.ensureAgent, orchestrator: ports.orchestrator as any, runRepo: ports.runRepo as any }, parsed.data as any, { developer: this.manifest.developer, serviceId: this.manifest.serviceId, version: this.manifest.version });
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}

