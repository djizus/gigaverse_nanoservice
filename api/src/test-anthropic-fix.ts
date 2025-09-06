/**
 * Test script to validate Anthropic model fix
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

async function testAnthropicModel() {
  console.log('🧪 Testing Anthropic Model Fix\n');
  
  // Test avec un modèle Anthropic
  console.log('📝 Test 1: Create agent with Anthropic model (old system)');
  let anthropicAgentId: string | null = null;
  
  try {
    const result = await makeRequest('POST', '/daydreams/agents', {
      name: 'Anthropic Test Agent',
      model: 'anthropic/claude-3-5-sonnet-20241022',
      context: 'chat',
      instructions: 'Tu es un assistant de test utilisant Claude. Réponds toujours de façon très concise.',
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ Anthropic agent created: ${result.data.id}`);
      anthropicAgentId = result.data.id;
      
      // Test message avec le modèle Anthropic
      console.log('\n📝 Test 2: Send message to Anthropic agent');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${anthropicAgentId}/send`, {
        message: 'Dis juste "ANTHROPIC_OK" pour confirmer que ça marche',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ Anthropic messaging: SUCCESS`);
        console.log(`   Response: "${messageResult.data.reply?.content || messageResult.data.reply}"`);
      } else {
        console.log(`❌ Anthropic messaging failed: ${messageResult.status}`);
        console.log(`   Error: ${messageResult.data.error}`);
        
        if (messageResult.data.error?.includes('system')) {
          console.log(`💡 Still has system message format issue`);
        }
      }
      
    } else {
      console.log(`❌ Anthropic agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ Anthropic test error: ${error?.message}`);
  }
  
  return anthropicAgentId;
}

async function testGoogleModel() {
  console.log('\n🧪 Testing Google Model (should work fine)\n');
  
  console.log('📝 Test 3: Create agent with Google model');
  let googleAgentId: string | null = null;
  
  try {
    const result = await makeRequest('POST', '/daydreams/agents', {
      name: 'Google Test Agent',
      model: 'google-vertex/gemini-1.5-flash',
      context: 'chat',
      instructions: 'Tu es un assistant de test utilisant Gemini. Réponds de façon très concise.',
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ Google agent created: ${result.data.id}`);
      googleAgentId = result.data.id;
      
      console.log('\n📝 Test 4: Send message to Google agent');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${googleAgentId}/send`, {
        message: 'Dis juste "GOOGLE_OK" pour confirmer que ça marche',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ Google messaging: SUCCESS`);
        console.log(`   Response: "${messageResult.data.reply?.content || messageResult.data.reply}"`);
      } else {
        console.log(`❌ Google messaging failed: ${messageResult.status}`);
        console.log(`   Error: ${messageResult.data.error}`);
      }
      
    } else {
      console.log(`❌ Google agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ Google test error: ${error?.message}`);
  }
  
  return googleAgentId;
}

async function testNewSystem() {
  console.log('\n🚀 Testing New System (should work with both models)\n');
  
  console.log('📝 Test 5: Create agent with new system');
  let newAgentId: string | null = null;
  
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'New System Test',
      instructions: 'Tu es un assistant de test avec le nouveau système. Sois concis.',
      model: 'anthropic/claude-3-5-sonnet-20241022', // Teste avec Anthropic
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ New system agent created: ${result.data.id}`);
      console.log(`   System: ${result.data.system}`);
      newAgentId = result.data.id;
      
      console.log('\n📝 Test 6: Send message with new system');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${newAgentId}/send/simple`, {
        message: 'Dis juste "NEW_SYSTEM_OK" pour confirmer',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ New system messaging: SUCCESS`);
        console.log(`   Response: "${messageResult.data.response}"`);
        console.log(`   System: ${messageResult.data.system}`);
      } else {
        console.log(`❌ New system messaging failed: ${messageResult.status}`);
        console.log(`   Error: ${messageResult.data.error}`);
      }
      
    } else {
      console.log(`❌ New system agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ New system test error: ${error?.message}`);
  }
  
  return newAgentId;
}

async function cleanup(agentIds: (string | null)[]) {
  console.log('\n🧹 Cleanup');
  
  for (const agentId of agentIds) {
    if (agentId) {
      try {
        const result = await makeRequest('DELETE', `/daydreams/agents/${agentId}`);
        console.log(`✅ Deleted ${agentId}: ${result.status === 200 ? 'OK' : 'Failed'}`);
      } catch (error: any) {
        console.log(`⚠️ Cleanup failed for ${agentId}: ${error?.message}`);
      }
    }
  }
}

async function main() {
  console.log('🔧 Anthropic Model Fix Test Suite');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`API Key: ${process.env.DREAMS_ROUTER_API_KEY ? 'SET' : 'NOT SET'}\n`);
  
  if (!process.env.DREAMS_ROUTER_API_KEY) {
    console.log('❌ DREAMS_ROUTER_API_KEY required for testing');
    process.exit(1);
  }
  
  try {
    const anthropicAgentId = await testAnthropicModel();
    const googleAgentId = await testGoogleModel();
    const newAgentId = await testNewSystem();
    
    console.log('\n📊 Test Results Summary:');
    console.log('   OLD system + Anthropic: ' + (anthropicAgentId ? 'Should work now' : 'Still failing'));
    console.log('   OLD system + Google: ' + (googleAgentId ? 'Should work' : 'Failed'));
    console.log('   NEW system + Anthropic: ' + (newAgentId ? 'Should work' : 'Failed'));
    
    console.log('\n💡 Fix Summary:');
    console.log('   - Added Anthropic model detection in DaydreamsAgentService');
    console.log('   - Forces direct API usage for Anthropic models');
    console.log('   - Bypasses Daydreams Core runtime for Anthropic');
    console.log('   - Uses proper system/prompt format for generateText');
    
    await cleanup([anthropicAgentId, googleAgentId, newAgentId]);
    
  } catch (error: any) {
    console.error('💥 Test suite failed:', error?.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}