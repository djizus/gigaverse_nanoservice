import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { manifest as svcManifest, uiSchema, StartRunSchema, buildPorts, startRunOp } from '../../domains/vega-trading';
import { AgentService } from '../../daydreams/services/agent.service';

export class VegaTradingServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private daydreamsAgent?: DaydreamsAgentService | null;
  private agents?: AgentService;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService | null; agents?: AgentService }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = { ...svcManifest, developer, uiSchema };
    this.db = opts.database;
    this.daydreamsAgent = opts.agent;
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
          // No orchestrator mapping available; run op with empty mapping
          const dummyPorts = { ensureAgent: async ()=>'none', orchestrator: { ensureRunSession: async ()=>({ sessionId: 'none' }) }, runRepo: { setRunMeta: async ()=>({}) } } as any;
          return startRunOp(this.db, this.daydreamsAgent || null, dummyPorts, parsed.data as any, { developer: this.manifest.developer, serviceId: this.manifest.serviceId, version: this.manifest.version });
        }
        const ports = buildPorts({ db: this.db, agents: this.agents, serviceName: 'Vega Trading Orchestrator', defaultModel: parsed.data.llmModel, orchestratorName: 'Vega Trading Orchestrator' });
        return startRunOp(this.db, this.daydreamsAgent || null, { ensureAgent: ports.ensureAgent, orchestrator: ports.orchestrator as any, runRepo: ports.runRepo as any }, parsed.data as any, { developer: this.manifest.developer, serviceId: this.manifest.serviceId, version: this.manifest.version });
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
