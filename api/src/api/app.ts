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
    console.log(`🧠 Daydreams Agent enabled (fallback echo mode: no API key)`);
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
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  console.log(`🌐 CORS origin: ${corsOrigin}`);
  app.use('/*', cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
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
  app.route('/', createHealthRoutes());
  app.route('/', createGameRoutes(dungeonController, deps.paymentConfig, databaseService));
  app.route('/', createDaydreamsRoutes({ 
    agentService, 
    contextRegistry, 
    daydreamsLLM: daydreamsAgent,
    agentRegistry // Enable hybrid system
  }));
  
  // Nano services using existing daydreams routes
  console.log(`🔗 Nano services available via /daydreams/* endpoints`);

  return app;
}
