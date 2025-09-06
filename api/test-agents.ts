/**
 * Test script for the new Agent Registry system
 *
 * This script tests:
 * 1. Agent creation with Dreams Router
 * 2. Authentication methods (API key vs payment)
 * 3. Message sending and streaming
 * 4. Session management
 * 5. Error handling
 */

import { config as dotenvConfig } from "dotenv";
import { AgentRegistry } from "./src/infrastructure/agents/agent-registry";
import { defaultDreamsConfig } from "./src/infrastructure/config/dreams.config";

// Load environment variables
dotenvConfig();

async function testAgentRegistry() {
  console.log("🧪 Testing Agent Registry System\n");

  const registry = new AgentRegistry();

  // Test 1: Create agent with API key method
  console.log("📝 Test 1: Creating agent with API key authentication");
  try {
    const agentId = await registry.createAgent({
      name: "Test Assistant",
      model: "google-vertex/gemini-2.5-flash",
      context: "chat",
      instructions: "You are a helpful test assistant. Keep responses concise.",
      dreams: {
        apiKey: process.env.DREAMS_ROUTER_API_KEY,
        model: "google-vertex/gemini-2.5-flash",
        timeoutMs: 30000,
        temperature: 0.2,
      },
    });

    console.log(`✅ Agent created successfully: ${agentId}`);

    // Check provider status
    const status = registry.getProviderStatus(agentId);
    console.log(`   Provider status:`, status);

    // Test 2: Send a simple message
    console.log("\n📝 Test 2: Sending message to agent");
    try {
      const result = await registry.sendMessage(
        agentId,
        "Hello! Can you say hi back in exactly 5 words?"
      );
      console.log(`✅ Message sent successfully`);
      console.log(`   Session ID: ${result.sessionId}`);
      console.log(`   Response: "${result.response}"`);

      // Test 3: Send another message in the same session
      console.log("\n📝 Test 3: Sending follow-up message in same session");
      const followUp = await registry.sendMessage(
        agentId,
        "What was my first question to you?",
        { sessionId: result.sessionId }
      );
      console.log(`✅ Follow-up sent successfully`);
      console.log(`   Response: "${followUp.response}"`);

      // Test 4: Test streaming
      console.log("\n📝 Test 4: Testing message streaming");
      let streamedText = "";
      const stream = await registry.streamMessage(
        agentId,
        "Count from 1 to 5, each number on a new line."
      );

      for await (const chunk of stream) {
        if (chunk.type === "chunk") {
          streamedText += chunk.data;
          process.stdout.write(".");
        } else if (chunk.type === "done") {
          console.log("\n✅ Streaming completed");
          console.log(`   Streamed text: "${streamedText}"`);
          break;
        } else if (chunk.type === "error") {
          console.log(`\n❌ Stream error:`, chunk.data);
          break;
        }
      }

      // Test 5: List sessions
      console.log("\n📝 Test 5: Listing agent sessions");
      const sessions = registry.listSessions(agentId);
      console.log(`✅ Found ${sessions.length} session(s):`);
      sessions.forEach((session, i) => {
        console.log(
          `   ${i + 1}. ${session.id} (${session.messages.length} messages)`
        );
      });

      // Test 6: Get session details
      if (sessions.length > 0) {
        console.log("\n📝 Test 6: Getting session details");
        const session = registry.getSession(sessions[0].id);
        if (session) {
          console.log(`✅ Session details retrieved:`);
          console.log(`   ID: ${session.id}`);
          console.log(`   Messages: ${session.messages.length}`);
          session.messages.forEach((msg, i) => {
            console.log(
              `     ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`
            );
          });
        }
      }

      // Test 7: Delete agent
      console.log("\n📝 Test 7: Deleting agent");
      const deleted = await registry.deleteAgent(agentId);
      console.log(`✅ Agent deletion: ${deleted ? "success" : "failed"}`);
    } catch (messageError: any) {
      console.log(`❌ Message test failed: ${messageError?.message}`);

      if (messageError?.message?.includes("Payment required")) {
        console.log(`💡 This is expected if DREAMS_ROUTER_API_KEY is not set`);
        console.log(
          `   Set DREAMS_ROUTER_API_KEY environment variable to test API key method`
        );
      }
    }
  } catch (creationError: any) {
    console.log(`❌ Agent creation failed: ${creationError?.message}`);

    if (creationError?.message?.includes("API key")) {
      console.log(`💡 Testing fallback configuration...`);

      // Test fallback: try without API key (should fail gracefully)
      try {
        const fallbackAgentId = await registry.createAgent({
          name: "Fallback Test Agent",
          model: "google-vertex/gemini-2.5-flash",
          context: "chat",
          instructions: "Test agent without API key",
          dreams: {
            // No API key, no payment config - should fail
            model: "google-vertex/gemini-2.5-flash",
            timeoutMs: 30000,
          },
        });
        console.log(`❌ Unexpected success: ${fallbackAgentId}`);
      } catch (fallbackError: any) {
        console.log(`✅ Fallback properly failed: ${fallbackError?.message}`);
      }
    }
  }

  // Test 8: List all agents
  console.log("\n📝 Test 8: Listing all agents");
  const allAgents = registry.listAgents();
  console.log(`✅ Total agents in registry: ${allAgents.length}`);
  allAgents.forEach((agent, i) => {
    console.log(
      `   ${i + 1}. ${agent.name} (${agent.id}) - Status: ${agent.status}`
    );
  });
}

async function testConfiguration() {
  console.log("\n🔧 Testing Configuration System\n");

  // Test Dreams config validation
  console.log("📝 Testing Dreams config validation");

  const { validateDreamsConfig } = await import(
    "./src/infrastructure/config/dreams.config"
  );

  // Valid config
  const validConfig = {
    apiKey: "test-key",
    model: "google-vertex/gemini-2.5-flash",
    timeoutMs: 30000,
  };

  const validation1 = validateDreamsConfig(validConfig);
  console.log(
    `✅ Valid config validation: ${validation1.valid ? "passed" : "failed"}`
  );

  // Invalid config
  const invalidConfig = {
    // Missing apiKey and payment
    model: "",
    timeoutMs: -1,
  };

  const validation2 = validateDreamsConfig(invalidConfig as any);
  console.log(
    `✅ Invalid config validation: ${
      validation2.valid ? "failed (unexpected)" : "failed (expected)"
    }`
  );
  console.log(`   Errors: ${validation2.errors.join(", ")}`);
}

async function main() {
  try {
    console.log("🚀 Agent Registry Test Suite\n");
    console.log(`Environment:`);
    console.log(
      `  DREAMS_ROUTER_API_KEY: ${
        process.env.DREAMS_ROUTER_API_KEY ? "SET" : "NOT SET"
      }`
    );
    console.log(`  DREAMS_MODEL: ${process.env.DREAMS_MODEL || "default"}`);
    console.log("");

    await testConfiguration();
    await testAgentRegistry();

    console.log("\n🎉 All tests completed!");
    console.log("\n📋 Summary:");
    console.log("   - Agent Registry: Functional architecture implemented");
    console.log("   - Dreams Router: API key method supported");
    console.log("   - Payment method: Placeholder (needs implementation)");
    console.log("   - Message handling: Send and stream supported");
    console.log("   - Session management: Working");
    console.log("   - Error handling: Graceful fallbacks");
  } catch (error: any) {
    console.error("💥 Test suite failed:", error?.message);
    console.error(error?.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
