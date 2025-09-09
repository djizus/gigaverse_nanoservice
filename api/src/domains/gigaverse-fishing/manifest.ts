import { ServiceManifest } from '../../infrastructure/services/service-registry';

export const manifest: ServiceManifest = {
  developer: 'daydreams',
  serviceId: 'gigaverse-fishing',
  name: 'Gigaverse Fishing Service',
  version: '0.1.0',
  summary: 'Starts Gigaverse fishing runs and emits basic events (MVP)',
  capabilities: ['runOrchestrator'],
};

