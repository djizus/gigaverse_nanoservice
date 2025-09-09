import { ServiceManifest } from '../../infrastructure/services/service-registry';

export const manifest: ServiceManifest = {
  developer: 'daydreams',
  serviceId: 'loot-survivor',
  name: 'Loot Survivor Context Service',
  version: '0.1.1',
  summary: 'Read-only context and agent insight for Loot Survivor',
  capabilities: ['runOrchestrator', 'contextProvider'],
};

