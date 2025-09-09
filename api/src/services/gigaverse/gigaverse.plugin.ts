import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DungeonService } from '../../domains/dungeon/dungeon.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { AgentService } from '../../daydreams/services/agent.service';
import { manifest as svcManifest, uiSchema } from '../../domains/gigaverse-dungeon';
import { StartRunSchema } from '../../domains/gigaverse-dungeon';
import { buildPorts } from '../../domains/gigaverse-dungeon';
import { startRunOp } from '../../domains/gigaverse-dungeon';

export class GigaverseServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private dungeon: DungeonService;
  private db: DatabaseService;
  private agents?: AgentService;
  private orchestratorAgentName?: string;
  private ensureAgent?: () => Promise<string>;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService; agents?: AgentService; orchestratorAgentId?: string; orchestratorAgentName?: string }) {
    this.manifest = { ...svcManifest, developer: opts.developer || svcManifest.developer, uiSchema };
    this.db = opts.database;
    this.dungeon = new DungeonService(this.db, opts.agent);
    this.agents = opts.agents;
    this.orchestratorAgentName = opts.orchestratorAgentName;
  }

  async init() {
    await this.dungeon.initialize();
    // Build ports and ensure dedicated service agent
    if (this.agents) {
      const ports = buildPorts({ db: this.db, agents: this.agents, serviceName: 'Gigaverse Orchestrator', defaultModel: 'google-vertex/gemini-2.5-flash', orchestratorName: this.orchestratorAgentName });
      this.ensureAgent = ports.ensureAgent;
      try { await ports.ensureAgent(); } catch {}
    }
  }

  async health() {
    return { ok: true };
  }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        const parsed = StartRunSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues.map(i=>i.message).join('; '));
        if (!this.agents) {
          // Fallback to legacy behavior without explicit orchestrator mapping
          return this.dungeon.startDungeonRuns(parsed.data as any, { serviceId: this.manifest.serviceId, developer: this.manifest.developer, meta: { source: 'ns', version: this.manifest.version } });
        }
        const ports = buildPorts({ db: this.db, agents: this.agents, serviceName: 'Gigaverse Orchestrator', defaultModel: parsed.data.llmModel, orchestratorName: this.orchestratorAgentName });
        return startRunOp(this.db, this.dungeon, { ensureAgent: ports.ensureAgent, orchestrator: ports.orchestrator as any, runRepo: ports.runRepo as any }, parsed.data as any, { developer: this.manifest.developer, serviceId: this.manifest.serviceId, version: this.manifest.version });
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
