import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DungeonService } from '../../domains/dungeon/dungeon.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';
import { AgentService } from '../../daydreams/services/agent.service';

export class GigaverseServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private dungeon: DungeonService;
  private db: DatabaseService;
  private agents?: AgentService;
  private orchestratorAgentId?: string;
  private orchestratorAgentName?: string;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService; agents?: AgentService; orchestratorAgentId?: string; orchestratorAgentName?: string }) {
    this.manifest = {
      developer: opts.developer || 'daydreams',
      serviceId: 'gigaverse-dungeon',
      name: 'Gigaverse Dungeon Service',
      version: '1.0.0',
      summary: 'Runs Gigaverse dungeon runs and emits real-time events',
      capabilities: ['runOrchestrator'],
      uiSchema: {
        fields: [
          { id: 'playerAddress', label: 'Player Address', type: 'text', required: true },
          { id: 'gigaverseToken', label: 'Gigaverse Token', type: 'textarea', required: true },
          { id: 'dungeonId', label: 'Dungeon', type: 'number', required: true, min: 1, max: 10 },
          { id: 'totalRuns', label: 'Runs', type: 'number', required: true, min: 1, max: 100, default: 1 },
          { id: 'llmModel', label: 'Model', type: 'text', required: false, default: 'google-vertex/gemini-2.5-flash' },
          { id: 'isJuiced', label: 'Juiced', type: 'checkbox', required: false, default: false },
          { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: true, default: 'Be aggressive in combat.\nPrioritize attack and armor upgrades when looting, but loot heal when you are below 50% health.'}
        ]
      }
    };
    this.db = opts.database;
    this.dungeon = new DungeonService(this.db, opts.agent);
    this.agents = opts.agents;
    this.orchestratorAgentId = opts.orchestratorAgentId;
    this.orchestratorAgentName = opts.orchestratorAgentName;
  }

  async init() {
    await this.dungeon.initialize();
    try {
      if (this.agents) {
        if (!this.orchestratorAgentId) {
          const list = await this.agents.listAgents().catch(() => [] as any[]);
          const names = [this.orchestratorAgentName, 'Gigaverse Agent', 'Gigaverse Orchestrator'].filter(Boolean) as string[];
          let found:any = null;
          for (const n of names) { found = (list||[]).find((a:any)=> (a.name||'').toLowerCase()===n.toLowerCase()); if (found) break; }
          if (found) this.orchestratorAgentId = found.id;
        }
      }
    } catch {}
  }

  async health() {
    return { ok: true };
  }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        // Start the run first to obtain runId (non-blocking processing)
        const response = await this.dungeon.startDungeonRuns({
          user_instructions: data.user_instructions,
          playerAddress: data.playerAddress,
          gigaverseToken: data.gigaverseToken,
          totalRuns: data.totalRuns,
          dungeonId: data.dungeonId,
          isJuiced: data.isJuiced,
          consumables: data.consumables,
          gearInstanceIds: data.gearInstanceIds,
          llmModel: data.llmModel,
        }, { serviceId: this.manifest.serviceId, developer: this.manifest.developer, meta: { source: 'ns', version: this.manifest.version } });
        let agentId: string | undefined;
        let sessionId: string | undefined;
        try {
          if (this.agents && response?.runId) {
            const name = `Gigaverse Orchestrator (#${response.runId.slice(0,6)})`;
            const model = data.llmModel || 'google-vertex/gemini-2.5-flash';
            const context = 'gigaverse';
            const instructions = (data.user_instructions as string) || 'You orchestrate Gigaverse dungeon runs. Be concise and tactical.';
            const agent = await this.agents.createAgent({ name, model, context, description: 'Gigaverse run orchestrator', instructions });
            const session = await this.agents.ensureSession(agent.id);
            agentId = agent.id; sessionId = session.id;
            await this.db.setRunMeta(response.runId, { agentId, sessionId });
          }
        } catch {}
        return agentId ? { ...response, agentId, sessionId } : response;
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
