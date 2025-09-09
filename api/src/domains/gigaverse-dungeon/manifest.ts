import { ServiceManifest } from '../../infrastructure/services/service-registry';

export const manifest: ServiceManifest = {
  developer: 'daydreams',
  serviceId: 'gigaverse-dungeon',
  name: 'Gigaverse Dungeon Service',
  version: '1.0.0',
  summary: 'Runs Gigaverse dungeon runs and emits real-time events',
  capabilities: ['runOrchestrator'],
};

