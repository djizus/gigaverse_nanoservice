import { Hono } from 'hono';

export interface ServiceManifest {
  developer: string; // default 'daydreams'
  serviceId: string; // e.g., 'gigaverse', 'loot-survivor'
  name: string;
  version: string;
  summary?: string;
  capabilities: string[]; // e.g., ['runOrchestrator', 'contextProvider']
  uiSchema?: Record<string, any>;
}

export interface ServiceContext {
  requestId?: string;
  userId?: string;
}

export interface ServicePlugin {
  manifest: ServiceManifest;
  init(): Promise<void> | void;
  health(): Promise<{ ok: boolean; message?: string }>; 
  // Single-op call contract
  call(op: string, data: any, ctx?: ServiceContext): Promise<any>;
}

export class ServiceRegistry {
  private plugins = new Map<string, ServicePlugin>();

  private key(dev: string, id: string) { return `${dev}:${id}`; }

  register(plugin: ServicePlugin) {
    const dev = plugin.manifest.developer || 'daydreams';
    const key = this.key(dev, plugin.manifest.serviceId);
    this.plugins.set(key, plugin);
  }

  get(developer: string | undefined, serviceId: string): ServicePlugin | undefined {
    const dev = developer || 'daydreams';
    return this.plugins.get(this.key(dev, serviceId));
  }

  list() {
    return Array.from(this.plugins.values()).map(p => p.manifest);
  }
}

export function createServicesRoutes(registry: ServiceRegistry) {
  const app = new Hono();
  app.get('/services', (c) => c.json(registry.list()));
  app.get('/services/:developer/:service/manifest', (c) => {
    const dev = c.req.param('developer');
    const svc = c.req.param('service');
    const plugin = registry.get(dev, svc);
    if (!plugin) return c.json({ error: 'Service not found' }, 404);
    return c.json(plugin.manifest);
  });
  return app;
}

