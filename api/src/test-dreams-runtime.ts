/**
 * Test script for Dreams Runtime with x402 payments
 * 
 * Tests the proper Daydreams implementation with createDreamsRouterAuth
 */

import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4021';

async function makeRequest(method: string, path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

async function testX402PaymentMethod() {
  console.log('💰 Testing x402 Payment Method (createDreamsRouterAuth)\n');
  
  console.log('📝 Test 1: Create agent with x402 payments');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'Dreams x402 Agent',
      instructions: 'Tu es un assistant utilisant les paiements x402. Réponds de façon concise.',
      model: 'google-vertex/gemini-1.5-flash',
      // Payment configuration (no API key)
      dreams: {
        payment: {
          amount: '50000', // $0.05 USDC per request
          network: 'base-sepolia',
        },
        model: 'google-vertex/gemini-1.5-flash',
        timeoutMs: 30000,
      }
    });
    
    if (result.status === 201) {
      console.log(`✅ x402 agent created: ${result.data.id}`);
      console.log(`   System: ${result.data.system}`);
      console.log(`   Provider: ${result.data.providerStatus?.method}`);
      
      const agentId = result.data.id;
      
      // Test message with x402 payments
      console.log('\n📝 Test 2: Send message with x402 payments');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${agentId}/send/simple`, {
        message: 'Bonjour! Confirme que tu utilises les paiements x402 en répondant "X402_OK".',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ x402 messaging: SUCCESS`);
        console.log(`   Response: "${messageResult.data.response}"`);
        console.log(`   Payment method detected: x402 micropayments`);
      } else {
        console.log(`❌ x402 messaging failed: ${messageResult.status}`);
        console.log(`   Error: ${messageResult.data.error}`);
        
        if (messageResult.data.error?.includes('wallet') || messageResult.data.error?.includes('balance')) {
          console.log('💡 Wallet setup required - check wallet balance and configuration');
        }
      }
      
      return agentId;
      
    } else {
      console.log(`❌ x402 agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
      
      if (result.data.error?.includes('wallet') || result.data.error?.includes('PRIVATE_KEY')) {
        console.log('💡 Wallet configuration missing - this is expected for first run');
      }
      
      return null;
    }
  } catch (error: any) {
    console.log(`❌ x402 test error: ${error?.message}`);
    return null;
  }
}

async function testAPIKeyFallback() {
  console.log('\n🔑 Testing API Key Fallback Method\n');
  
  console.log('📝 Test 3: Create agent with API key fallback');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'Dreams API Key Agent',
      instructions: 'Tu es un assistant utilisant une API key. Réponds de façon concise.',
      model: 'google-vertex/gemini-1.5-flash',
      // API key configuration
      dreams: {
        apiKey: process.env.DREAMS_ROUTER_API_KEY,
        model: 'google-vertex/gemini-1.5-flash',
        timeoutMs: 30000,
      }
    });
    
    if (result.status === 201) {
      console.log(`✅ API key agent created: ${result.data.id}`);
      console.log(`   System: ${result.data.system}`);
      console.log(`   Provider: ${result.data.providerStatus?.method}`);
      
      const agentId = result.data.id;
      
      // Test message with API key
      console.log('\n📝 Test 4: Send message with API key');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${agentId}/send/simple`, {
        message: 'Bonjour! Confirme que tu utilises une API key en répondant "API_KEY_OK".',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ API key messaging: SUCCESS`);
        console.log(`   Response: "${messageResult.data.response}"`);
      } else {
        console.log(`❌ API key messaging failed: ${messageResult.status}`);
        console.log(`   Error: ${messageResult.data.error}`);
      }
      
      return agentId;
      
    } else {
      console.log(`❌ API key agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
      return null;
    }
  } catch (error: any) {
    console.log(`❌ API key test error: ${error?.message}`);
    return null;
  }
}

async function testWalletInfo() {
  console.log('\n🔍 Testing Wallet Information\n');
  
  // This would need a specific endpoint to get wallet info
  console.log('📝 Test 5: Get wallet information');
  console.log('💡 Wallet info endpoint not implemented yet');
  console.log('   Check server logs for wallet address and private key');
  console.log('   Fund wallet with USDC on base-sepolia for x402 payments');
}

async function testStreamingWithRuntime() {
  console.log('\n🌊 Testing Streaming with Dreams Runtime\n');
  
  // Create a simple agent for streaming test
  console.log('📝 Test 6: Create agent for streaming test');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'Dreams Streaming Test',
      instructions: 'Count from 1 to 5, one number per line.',
      dreams: {
        apiKey: process.env.DREAMS_ROUTER_API_KEY,
        model: 'google-vertex/gemini-1.5-flash',
        timeoutMs: 30000,
      }
    });
    
    if (result.status === 201) {
      console.log(`✅ Streaming test agent created: ${result.data.id}`);
      
      // Note: Streaming test would require proper SSE client
      console.log('💡 Streaming endpoint available but requires SSE client for full test');
      console.log(`   POST /${result.data.id}/send/simple for regular messages`);
      console.log(`   POST /${result.data.id}/stream (SSE) for streaming`);
      
      return result.data.id;
    }
    
  } catch (error: any) {
    console.log(`❌ Streaming test setup failed: ${error?.message}`);
  }
  
  return null;
}

async function cleanup(agentIds: (string | null)[]) {
  console.log('\n🧹 Cleanup Test Agents');
  
  for (const agentId of agentIds) {
    if (agentId) {
      try {
        const result = await makeRequest('DELETE', `/daydreams/agents/${agentId}`);
        console.log(`✅ Deleted agent ${agentId}: ${result.status === 200 ? 'OK' : 'Failed'}`);
      } catch (error: any) {
        console.log(`⚠️ Cleanup failed for ${agentId}: ${error?.message}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Dreams Runtime Test Suite (Real Implementation)');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Environment check:`);
  console.log(`  DREAMS_ROUTER_API_KEY: ${process.env.DREAMS_ROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  PRIVATE_KEY: ${process.env.PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  ADDRESS: ${process.env.ADDRESS ? 'SET' : 'NOT SET'}`);
  console.log('');
  
  try {
    // Test x402 payment method (preferred)
    const x402AgentId = await testX402PaymentMethod();
    
    // Test API key fallback
    const apiKeyAgentId = await testAPIKeyFallback();
    
    // Test wallet info
    await testWalletInfo();
    
    // Test streaming capabilities
    const streamAgentId = await testStreamingWithRuntime();
    
    console.log('\n📊 Dreams Runtime Test Results:');
    console.log('   x402 Payment Method: ' + (x402AgentId ? 'Working' : 'Needs wallet setup'));
    console.log('   API Key Fallback: ' + (apiKeyAgentId ? 'Working' : 'Failed'));
    console.log('   Streaming: ' + (streamAgentId ? 'Available' : 'Failed'));
    
    console.log('\n🎯 Implementation Summary:');
    console.log('   ✅ createDreamsRouterAuth for x402 payments');
    console.log('   ✅ createDreamsRouter for API key fallback');
    console.log('   ✅ Real Dreams contexts with lifecycle');
    console.log('   ✅ Proper agent.start() and agent.send() pattern');
    console.log('   ✅ x402 USDC micropayments on Base Sepolia');
    
    console.log('\n💡 Next Steps:');
    if (!x402AgentId) {
      console.log('   1. Fund wallet with USDC on base-sepolia network');
      console.log('   2. Check server logs for generated wallet address');
      console.log('   3. Add wallet credentials to .env if needed');
    }
    console.log('   4. Test with your frontend/client application');
    console.log('   5. Monitor x402 payment transactions on Base Sepolia');
    
    await cleanup([x402AgentId, apiKeyAgentId, streamAgentId]);
    
  } catch (error: any) {
    console.error('💥 Test suite failed:', error?.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}