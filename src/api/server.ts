import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig, getPaymentConfig, getSupabaseConfig } from "../infrastructure/config/env.config";
import { DatabaseService } from "../infrastructure/database/database.service";
import { DungeonService } from "../domains/dungeon/dungeon.service";
import { DungeonController } from "../domains/dungeon/dungeon.controller";
import { createGameRoutes } from "./routes/game.routes";
import { createHealthRoutes } from "./routes/health.routes";
import { DaydreamsAgentService } from "../infrastructure/ai/daydreams.agent";
import { aiConfig } from "../infrastructure/config/ai.config";

// Bootstrap application
async function bootstrap() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    const paymentConfig = getPaymentConfig(config);
    const supabaseConfig = getSupabaseConfig(config);
    
    console.log("🏰 Initializing real-time dungeon service...");
    
    // Initialize database service
    const databaseService = new DatabaseService(supabaseConfig);
    
    // Initialize optional Daydreams agent
    const daydreamsAgent = new DaydreamsAgentService();
    if (aiConfig.enabled) {
      console.log(`🧠 Daydreams Agent enabled (model: ${aiConfig.model})`);
    } else {
      console.log(`🧠 Daydreams Agent disabled`);
    }

    // Initialize dungeon service with database dependency and agent
    const dungeonService = new DungeonService(databaseService, daydreamsAgent);
    await dungeonService.initialize();
    
    // Initialize controllers
    const dungeonController = new DungeonController(dungeonService);
    
    // Create HTTP server
    const app = new Hono();
    
    // Register routes
    app.route("/", createHealthRoutes());
    app.route("/", createGameRoutes(dungeonController, paymentConfig, databaseService));
    
    // Start server
    console.log(`🚀 Server starting on port ${config.PORT}`);
    serve({
      fetch: app.fetch,
      port: config.PORT,
    });
    
    console.log(`✅ Real-time Dungeon Nano Service running on port ${config.PORT}`);
    
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
