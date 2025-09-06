import { serve } from "@hono/node-server";
import { loadConfig, getPaymentConfig, getSupabaseConfig } from "../infrastructure/config/env.config";
import { createApp } from "./app";

// Bootstrap application
async function bootstrap() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    const paymentConfig = getPaymentConfig(config);
    const supabaseConfig = getSupabaseConfig(config);
    
    console.log("🏰 Initializing services and routes...");

    // Build the app once using the app factory
    const app = await createApp({ paymentConfig, supabaseConfig });
    
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
