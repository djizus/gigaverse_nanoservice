#!/usr/bin/env bun
import { wrapFetchWithPayment } from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";
import { decodeXPaymentResponse } from "x402-fetch";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_URL = process.argv.includes('--deployed') ? 'https://ai-assistant.agent.daydreams.systems' : 'http://localhost:4021';

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY environment variable is required");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

async function testDungeonEndpoint() {
  console.log("🏰 Testing Gigaverse Dungeon Nanoservice");
  console.log("📍 Target URL:", BASE_URL);
  console.log("💳 Payment Account:", account.address);
  console.log();

  try {
    // Health check first (free)
    console.log("🔍 Health Check...");
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const health = await healthResponse.json();
    console.log("✅ Health:", health);
    const agentHealth = health?.daydreamsAgent || {};
    console.log("🧠 Daydreams Agent:", agentHealth);
    console.log(`🔧 Agent Enabled: ${agentHealth.enabled} | Model: ${agentHealth.model} | Timeout: ${agentHealth.timeoutMs}ms`);
    if (!agentHealth.enabled) {
      console.error("❌ Daydreams agent is disabled. Set DREAMS_ROUTER_API_KEY to enable decisions.");
      process.exit(1);
    }
    console.log();

    // Service info (free)  
    console.log("ℹ️  Service Info...");
    const infoResponse = await fetch(`${BASE_URL}/`);
    const info = await infoResponse.json();
    console.log("✅ Info:", info);
    console.log();

    // Dungeon run request (paid)
    console.log("🗡️  Starting Dungeon Run...");
    
    const dungeonRequest = {
      user_instructions: "Be aggressive in combat, prioritize attack upgrades when looting",
      playerAddress: account.address,
      gigaverseToken: "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhFMENCRjVFZjJCOUU1MkE5Q2NDMDg0YTZBYjVlNDhFMEU5NTVDOWIxIiwidXNlciI6eyJsZWdhbENvbnNlbnREYXRhIjp7InRlcm1zQWNjZXB0ZWQiOnRydWUsInByaXZhY3lBY2NlcHRlZCI6dHJ1ZSwiaXBBZGRyZXNzIjoiOTIuMTg0LjExMC4xNTAiLCJ1c2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTM5LjAuMC4wIFNhZmFyaS81MzcuMzYiLCJ0aW1lc3RhbXAiOiIyMDI1LTA4LTMxVDEyOjMxOjExLjYwMVoifSwiX2lkIjoiNjdhZGJiODVlMWVlNjQ0YjFkYjIxMDlhIiwid2FsbGV0QWRkcmVzcyI6IjB4ZTBjYmY1ZWYyYjllNTJhOWNjYzA4NGE2YWI1ZTQ4ZTBlOTU1YzliMSIsInVzZXJuYW1lIjoiMHhFMENCRjVFZjJCOUU1MkE5Q2NDMDg0YTZBYjVlNDhFMEU5NTVDOWIxIiwiY2FzZVNlbnNpdGl2ZUFkZHJlc3MiOiIweEUwQ0JGNUVmMkI5RTUyQTlDY0MwODRhNkFiNWU0OEUwRTk1NUM5YjEiLCJfX3YiOjAsImhhc0FjY2VwdGVkTGVnYWwiOnRydWUsImxlZ2FsQWNjZXB0ZWRBdCI6IjIwMjUtMDgtMzFUMTI6MzE6MTEuMjA1WiIsImxhc3RMb2dpbiI6IjIwMjUtMDktMDRUMjE6MTQ6MjYuMzczWiJ9LCJnYW1lQWNjb3VudCI6eyJub29iIjp7Il9pZCI6IjY3YWRiYjlhNmU4ZmE3N2FhOTBjYjkxMiIsImRvY0lkIjoiMTU5NCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJjcmVhdGVkQXQiOiIyMDI1LTAyLTEzVDA5OjMwOjAyLjM5MloiLCJ1cGRhdGVkQXQiOiIyMDI1LTAyLTEzVDA5OjMwOjAyLjgyMVoiLCJMQVNUX1RSQU5TRkVSX1RJTUVfQ0lEIjoxNzM5NDM4OTkzLCJJU19OT09CX0NJRCI6dHJ1ZSwiT1dORVJfQ0lEIjoiMHhlMGNiZjVlZjJiOWU1MmE5Y2NjMDg0YTZhYjVlNDhlMGU5NTVjOWIxIiwiTEVWRUxfQ0lEIjoxfSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjc3MjQ2LCJtYXhOb29iSWQiOjEwMDAwLCJoYXNBY2NlcHRlZExlZ2FsIjp0cnVlLCJsZWdhbEFjY2VwdGVkQXQiOiIyMDI1LTA4LTMxVDEyOjMxOjExLjIwNVoifSwiZXhwIjoxNzU3MTA2ODY2fQ.zHQ3w5Vf-XQnxhjkZ99QAWzDdSjkj1JyPUmiyGsOQ1c",
      totalRuns: process.argv.includes('--duplicate') ? 1 : 2,
      dungeonId: 1,
      isJuiced: false,
      consumables: [],
      gearInstanceIds: []
    };

    console.log("📝 Request payload:", JSON.stringify(dungeonRequest, null, 2));
    console.log();

    const dungeonResponse = await fetchWithPayment(`${BASE_URL}/dungeon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dungeonRequest),
    });

    if (!dungeonResponse.ok) {
      const errorText = await dungeonResponse.text();
      console.error(`❌ HTTP ${dungeonResponse.status}: ${errorText}`);
      return;
    }

    const result = await dungeonResponse.json();
    console.log("✅ Dungeon Response:", JSON.stringify(result, null, 2));

    // Get payment info
    const paymentHeader = dungeonResponse.headers.get("x-payment-response");
    if (paymentHeader) {
      try {
        const paymentInfo = decodeXPaymentResponse(paymentHeader);
        console.log("💰 Payment Info:", paymentInfo);
      } catch (e) {
        console.log("💰 Payment Header:", paymentHeader);
      }
    }

    // Show subscription instructions
    if (result.runId) {
      console.log();
      console.log("🔔 Real-time Updates:");
      console.log("   Subscribe to Supabase table 'run_events'");
      console.log(`   Filter: dungeon_run_id=eq.${result.runId}`);
      console.log("   Events:");
      console.log("    - run_started, room_entered, combat_move, battle_result");
      console.log("    - loot_phase, loot_selected, room_cleared, run_completed, all_runs_completed");
      console.log("    - agent_decision_move, agent_decision_loot, agent_error, error");
      console.log();
      console.log("🔎 Expectation:");
      console.log("   - When agent is enabled, each move/loot should be preceded by agent_decision_* with a short reason.");
      console.log("   - On any agent failure or timeout, agent_error will be logged and the run will fail (no fallback).");
    }

  } catch (error) {
    console.error("❌ Test failed:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
  }
}

console.log("🚀 Starting Dungeon Test...");
testDungeonEndpoint();
