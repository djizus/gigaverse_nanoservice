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
      context: "Be aggressive in combat, prioritize attack upgrades when looting",
      playerAddress: account.address,
      gigaverseToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhFMENCRjVFZjJCOUU1MkE5Q2NDMDg0YTZBYjVlNDhFMEU5NTVDOWIxIiwiaWF0IjoxNzI1MjUzMzQ5LCJleHAiOjE3MjUzMzk3NDl9.example",
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
      console.log("   Events: run_started, combat_move, room_cleared, run_completed");
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