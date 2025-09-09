import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { GameStateConfig } from './engine/GameStateService';
import { manifest as svcManifest, uiSchema, ContextSchema, StartRunSchema, buildPorts, contextOp, startRunOp } from '../../domains/loot-survivor';
import { AgentService } from '../../daydreams/services/agent.service';

export class LootSurvivorServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private db: DatabaseService;
  private cfg: GameStateConfig;
  private agents?: AgentService;

  constructor(opts: { developer?: string; database: DatabaseService; config?: Partial<GameStateConfig>; agents?: AgentService }) {
    const developer = opts.developer || 'daydreams';
    this.manifest = { ...svcManifest, developer, uiSchema };
    this.db = opts.database;
    this.cfg = {
      toriiUrl: opts.config?.toriiUrl || process.env.TORII_URL || 'https://api.cartridge.gg/x/pg-sepolia/torii',
      namespace: opts.config?.namespace || process.env.NAMESPACE || 'ls_0_0_6',
    };
    this.agents = (opts as any).agents;
  }

  async init() {}
  async health() { return { ok: true }; }

  async call(op: string, data: any) {
    switch (op) {
      case 'context': {
        const parsed = ContextSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues.map(i=>i.message).join('; '));
        return contextOp(this.cfg, parsed.data);
      }
      case 'startRun': {
        const parsed = StartRunSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues.map(i=>i.message).join('; '));
        const ports = buildPorts({ db: this.db, agents: this.agents, serviceName: 'Loot Survivor Agent', defaultModel: parsed.data.llmModel, orchestratorName: 'Loot Survivor Agent' });
        return startRunOp(this.db, this.cfg, { ensureAgent: ports.ensureAgent, orchestrator: ports.orchestrator as any, runRepo: ports.runRepo as any }, parsed.data, { developer: this.manifest.developer, serviceId: this.manifest.serviceId, version: this.manifest.version });
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
