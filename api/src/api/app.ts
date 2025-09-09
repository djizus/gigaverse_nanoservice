import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createHealthRoutes } from './routes/health.routes';
import { createGameRoutes } from './routes/game.routes';
import { DatabaseService } from '../infrastructure/database/database.service';
import { DungeonService } from '../domains/dungeon/dungeon.service';
import { DungeonController } from '../domains/dungeon/dungeon.controller';
import { PaymentConfig } from '../shared/types/payment';
import { AgentService } from '../daydreams/services/agent.service';
import { MemoryStorage } from '../daydreams/services/memory-storage.service';
import { SupabaseStorage } from '../daydreams/services/supabase-storage.service';
import { ContextRegistryService } from '../daydreams/services/context-registry.service';
import { createDaydreamsRoutes } from '../daydreams/routes/daydreams.routes';
import { SupabaseConfig } from '../infrastructure/config/env.config';
import { DaydreamsAgentService } from '../infrastructure/ai/daydreams.agent';
import { aiConfig } from '../infrastructure/config/ai.config';
import { AgentRegistry } from '../infrastructure/agents/agent-registry';
import { createDungeonEventsRoutes } from './routes/dungeon.events.routes';
import { createDungeonUiRoutes } from './routes/dungeon.ui.routes';
import { ServiceRegistry, createServicesRoutes } from '../infrastructure/services/service-registry';
import { createNamespacedServiceRoutes } from './routes/ns.routes';
import { GigaverseServicePlugin } from '../services/gigaverse/gigaverse.plugin';
import { GigaverseFishingServicePlugin } from '../services/gigaverse-fishing/gigaverse-fishing.plugin';
import { LootSurvivorServicePlugin } from '../services/loot-survivor/loot-survivor.plugin';
import { VegaTradingServicePlugin } from '../services/vega-trading/vega-trading.plugin';
import { createUserAuthMiddleware } from '../shared/middleware/user-auth.middleware';

export interface AppDeps {
  paymentConfig: PaymentConfig;
  supabaseConfig: SupabaseConfig;
}

export async function createApp(deps: AppDeps) {
  // Core services
  const databaseService = new DatabaseService(deps.supabaseConfig);
  // Optional LLM agent for dungeon decisions
  const daydreamsAgent = new DaydreamsAgentService();
  await daydreamsAgent.initialize();
  if (daydreamsAgent.isEnabled) {
    console.log(`🧠 Daydreams Agent enabled (model: ${aiConfig.model})`);
  } else {
    console.log(`🧠 Daydreams Agent disabled (no API key)`);
  }
  const dungeonService = new DungeonService(databaseService, daydreamsAgent);
  await dungeonService.initialize();
  const dungeonController = new DungeonController(dungeonService);

  // Daydreams deps
  const useMemory = process.env.DAYDREAMS_USE_MEMORY === 'true';
  const storage = useMemory
    ? new MemoryStorage()
    : new SupabaseStorage(deps.supabaseConfig);
  const agentService = new AgentService(storage, daydreamsAgent);
  const contextRegistry = new ContextRegistryService();

  // Re-register existing agents into the LLM runtime on boot (if enabled)
  if (daydreamsAgent.isEnabled) {
    try {
      const existingAgents = await agentService.listAgents();
      let count = 0;
      for (const a of existingAgents) {
        try {
          daydreamsAgent.registerAgent({ id: a.id, model: a.model, name: a.name, context: a.context, instructions: a.instructions });
          count++;
        } catch {}
      }
      console.log(`🧠 Daydreams runtime registered ${count} agent(s) at boot`);
    } catch (err) {
      console.warn('⚠️  Failed to preload agents into Daydreams runtime:', err);
    }
  }
  console.log(`🧰 Daydreams storage: ${useMemory ? 'memory' : 'supabase'}`);

  // New Agent Registry (hybrid approach)
  const agentRegistry = new AgentRegistry();
  console.log(`🤖 Agent Registry initialized (hybrid architecture)`);

  // Routes
  const app = new Hono();

  // CORS for browser-based frontends
  const corsOriginRaw = process.env.CORS_ORIGIN || '*';
  const corsAllowed = corsOriginRaw.split(',').map(s => s.trim()).filter(Boolean);
  console.log(`🌐 CORS origin(s): ${corsAllowed.join(', ') || '*'}`);
  app.use('/*', cors({
    origin: (origin) => {
      if (!origin) return corsAllowed.includes('*') ? '*' : false;
      if (corsAllowed.includes('*')) return '*';
      return corsAllowed.includes(origin) ? origin : false;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'authorization',
      'X-Requested-With',
      'x-user-id',
      'X-User-Id',
      // Helpful for x402 headers if sent by clients
      'x402-price',
      'x402-network',
      'x402-sender',
      'x402-signature',
      'x402-payment'
    ],
    exposeHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 600,
  }));
  // Basic request logger to help diagnose routing/CORS issues
  app.use('*', async (c, next) => {
    if (process.env.LOG_LEVEL === 'debug') {
      try { console.log(`[HTTP] ${c.req.method} ${c.req.path}`); } catch {}
    }
    return next();
  });
  app.route('/', createHealthRoutes());
  app.route('/', createGameRoutes(dungeonController, deps.paymentConfig, databaseService));
  app.route('/', createDungeonEventsRoutes());
  app.route('/', createDungeonUiRoutes(dungeonController, databaseService, agentService));
  // Auth for user-scoped Daydreams routes (keep /daydreams/contexts public)
  const userAuth = createUserAuthMiddleware({
    supabaseUrl: deps.supabaseConfig.url,
    supabaseKey: deps.supabaseConfig.anonKey,
    allowDevHeader: process.env.DAYDREAMS_USE_MEMORY === 'true',
  });
  // Protect both root and nested routes for agents/sessions
  app.use('/daydreams/agents', userAuth);
  app.use('/daydreams/agents/*', userAuth);
  app.use('/daydreams/sessions', userAuth);
  app.use('/daydreams/sessions/*', userAuth);
  // Protect UI runs and companion endpoints
  app.use('/ui/dungeon/*', userAuth);
  app.use('/ui/run/*', userAuth);
  // Protect namespaced services calls
  app.use('/ns/*', userAuth);
  app.route('/', createDaydreamsRoutes({ 
    agentService, 
    contextRegistry, 
    daydreamsLLM: daydreamsAgent,
    agentRegistry // Enable hybrid system
  }));
  
  // Nano services using existing daydreams routes
  console.log(`🔗 Nano services available via /daydreams/* endpoints`);

  // Service Registry (namespaced services)
  const registry = new ServiceRegistry();
  // Register Gigaverse Dungeon plugin (renamed)
  const gvPlugin = new GigaverseServicePlugin({ developer: 'daydreams', database: databaseService, agent: daydreamsAgent, agents: agentService, orchestratorAgentName: process.env.GIGAVERSE_DUNGEON_AGENT_NAME || 'Gigaverse Agent' });
  await gvPlugin.init();
  registry.register(gvPlugin);
  // Register Gigaverse Fishing plugin
  const gvFishing = new GigaverseFishingServicePlugin({ developer: 'daydreams', database: databaseService, agent: daydreamsAgent, agents: agentService });
  await gvFishing.init();
  registry.register(gvFishing);
  // Register Loot Survivor plugin (read-only)
  const lsPlugin = new LootSurvivorServicePlugin({ developer: 'daydreams', database: databaseService, agents: agentService });
  await lsPlugin.init();
  registry.register(lsPlugin);
  // Register Vega Trading plugin
  const vega = new VegaTradingServicePlugin({ developer: 'daydreams', database: databaseService, agent: daydreamsAgent, agents: agentService });
  await vega.init();
  registry.register(vega);
  app.route('/', createServicesRoutes(registry));
  app.route('/', createNamespacedServiceRoutes(registry));
  console.log(`🧩 Namespaced services available via /ns/:developer/:service/* endpoints`);

  return app;
}
