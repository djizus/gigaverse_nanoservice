import { ServiceManifest } from '../../infrastructure/services/service-registry';

export const manifest: ServiceManifest = {
  developer: 'daydreams',
  serviceId: 'vega-trading',
  name: 'Vega Trading Signals',
  version: '0.1.0',
  summary: 'Fetches market data and asks Vega for trading signals',
  capabilities: ['signalProvider', 'runOrchestrator'],
};

