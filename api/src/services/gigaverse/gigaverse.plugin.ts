import { ServiceManifest, ServicePlugin } from '../../infrastructure/services/service-registry';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DungeonService } from '../../domains/dungeon/dungeon.service';
import { DaydreamsAgentService } from '../../infrastructure/ai/daydreams.agent';

export class GigaverseServicePlugin implements ServicePlugin {
  manifest: ServiceManifest;
  private dungeon: DungeonService;
  private db: DatabaseService;

  constructor(opts: { developer?: string; database: DatabaseService; agent?: DaydreamsAgentService }) {
    this.manifest = {
      developer: opts.developer || 'daydreams',
      serviceId: 'gigaverse',
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
          { id: 'context', label: 'Instructions', type: 'textarea', required: true, default: 'Be aggressive in combat.\nPrioritize attack and armor upgrades when looting, but loot heal when you are below 50% health.'}
        ]
      }
    };
    this.db = opts.database;
    this.dungeon = new DungeonService(this.db, opts.agent);
  }

  async init() {
    await this.dungeon.initialize();
  }

  async health() {
    return { ok: true };
  }

  async call(op: string, data: any) {
    switch (op) {
      case 'startRun': {
        // Expect same payload as existing Gigaverse dungeon schema
        const response = await this.dungeon.startDungeonRuns({
          context: data.context,
          playerAddress: data.playerAddress,
          gigaverseToken: data.gigaverseToken,
          totalRuns: data.totalRuns,
          dungeonId: data.dungeonId,
          isJuiced: data.isJuiced,
          consumables: data.consumables,
          gearInstanceIds: data.gearInstanceIds,
          llmModel: data.llmModel,
        });
        return response;
      }
      default:
        throw new Error(`Unsupported op: ${op}`);
    }
  }
}
