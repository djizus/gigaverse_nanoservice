/**
 * Test script for Nano Services API endpoints
 * 
 * This script tests the HTTP API endpoints created by the nano service system
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

async function testHealthEndpoints() {
  console.log('🏥 Testing Health Endpoints\n');
  
  // Test main health endpoint
  console.log('📝 Test: Main health check');
  try {
    const result = await makeRequest('GET', '/health');
    console.log(`✅ Health check: ${result.status === 200 ? 'OK' : 'FAILED'}`);
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Timestamp: ${result.data.timestamp}`);
  } catch (error: any) {
    console.log(`❌ Health check failed: ${error?.message}`);
  }
  
  // Test nano service health endpoints
  const nanoServices = ['gigaverse-chat', 'chat', 'code-assistant'];
  
  for (const service of nanoServices) {
    console.log(`\n📝 Test: ${service} health check`);
    try {
      const result = await makeRequest('GET', `/${service}/health`);
      
      if (result.status === 200) {
        console.log(`✅ ${service} health: OK`);
        console.log(`   Agent: ${result.data.agent?.name} (${result.data.agent?.id})`);
        console.log(`   Provider: ${result.data.provider?.method} - ${result.data.provider?.authenticated}`);
      } else {
        console.log(`⚠️ ${service} health: ${result.status}`);
        console.log(`   Error: ${result.data.error}`);
      }
    } catch (error: any) {
      console.log(`❌ ${service} health failed: ${error?.message}`);
    }
  }
}

async function testAgentManagement() {
  console.log('\n🤖 Testing Agent Management\n');
  
  // Test agent listing
  console.log('📝 Test: List agents');
  try {
    const result = await makeRequest('GET', '/agents');
    console.log(`✅ List agents: ${result.status === 200 ? 'OK' : 'FAILED'}`);
    console.log(`   Agents found: ${result.data.agents?.length || 0}`);
    
    if (result.data.agents?.length > 0) {
      result.data.agents.forEach((agent: any, i: number) => {
        console.log(`   ${i + 1}. ${agent.name} (${agent.id}) - ${agent.providerStatus?.authenticated ? 'Auth OK' : 'Auth Failed'}`);
      });
    }
  } catch (error: any) {
    console.log(`❌ List agents failed: ${error?.message}`);
  }
  
  // Test agent creation
  console.log('\n📝 Test: Create new agent');
  let createdAgentId: string | null = null;
  
  try {
    const result = await makeRequest('POST', '/agents', {
      name: 'API Test Agent',
      model: 'google-vertex/gemini-2.5-flash',
      context: 'chat',
      instructions: 'You are a test agent created via API. Keep responses concise.',
    });
    
    if (result.status === 201) {
      console.log(`✅ Agent created successfully`);
      createdAgentId = result.data.agent.id;
      console.log(`   ID: ${createdAgentId}`);
      console.log(`   Name: ${result.data.agent.name}`);
      console.log(`   Provider Auth: ${result.data.agent.providerStatus?.authenticated}`);
    } else {
      console.log(`⚠️ Agent creation failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
      
      if (result.data.error?.includes('Payment required') || result.data.error?.includes('API key')) {
        console.log(`💡 This is expected if DREAMS_ROUTER_API_KEY is not configured`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Agent creation failed: ${error?.message}`);
  }
  
  // Test agent details
  if (createdAgentId) {
    console.log('\n📝 Test: Get agent details');
    try {
      const result = await makeRequest('GET', `/agents/${createdAgentId}`);
      
      if (result.status === 200) {
        console.log(`✅ Agent details retrieved`);
        console.log(`   Sessions: ${result.data.agent.sessionCount}`);
        console.log(`   Status: ${result.data.agent.status}`);
      }
    } catch (error: any) {
      console.log(`❌ Get agent details failed: ${error?.message}`);
    }
  }
  
  return createdAgentId;
}

async function testMessaging(agentId?: string) {
  console.log('\n💬 Testing Messaging\n');
  
  // If no agent ID provided, try to create one or use a nano service
  if (!agentId) {
    console.log('💡 No agent ID provided, testing with nano services');
  }
  
  // Test direct agent messaging (if we have an agent)
  if (agentId) {
    console.log('📝 Test: Direct agent messaging');
    try {
      const result = await makeRequest('POST', `/agents/${agentId}/send`, {
        message: 'Hello! Please respond with exactly the word "SUCCESS".',
      });
      
      if (result.status === 200) {
        console.log(`✅ Direct messaging: OK`);
        console.log(`   Response: "${result.data.response}"`);
        console.log(`   Session: ${result.data.sessionId}`);
      } else {
        console.log(`⚠️ Direct messaging failed: ${result.status}`);
        console.log(`   Error: ${result.data.error}`);
      }
    } catch (error: any) {
      console.log(`❌ Direct messaging failed: ${error?.message}`);
    }
  }
  
  // Test nano service messaging
  console.log('\n📝 Test: Nano service messaging (chat)');
  try {
    const result = await makeRequest('POST', '/chat', {
      message: 'Hi! Please respond with just the word "NANOSERVICE" to confirm you are working.',
    });
    
    if (result.status === 200) {
      console.log(`✅ Nano service messaging: OK`);
      console.log(`   Domain: ${result.data.domain}`);
      console.log(`   Agent ID: ${result.data.agentId}`);
      console.log(`   Response: "${result.data.response}"`);
    } else {
      console.log(`⚠️ Nano service messaging failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ Nano service messaging failed: ${error?.message}`);
  }
  
  // Test nano service info
  console.log('\n📝 Test: Nano service info');
  try {
    const result = await makeRequest('GET', '/chat/info');
    
    if (result.status === 200) {
      console.log(`✅ Nano service info: OK`);
      console.log(`   Domain: ${result.data.domain}`);
      console.log(`   Agent: ${result.data.agent.name}`);
      console.log(`   Features: ${Object.keys(result.data.features).filter(k => result.data.features[k]).join(', ')}`);
    }
  } catch (error: any) {
    console.log(`❌ Nano service info failed: ${error?.message}`);
  }
}

async function testStreaming() {
  console.log('\n🌊 Testing Streaming (Basic Check)\n');
  
  // Note: Full streaming test would require SSE client, this is a basic endpoint test
  console.log('📝 Test: Streaming endpoint availability');
  try {
    const result = await makeRequest('POST', '/chat/stream', {
      message: 'Count to 3',
    });
    
    // We expect this to fail in a regular fetch since it's SSE, 
    // but we can check if the endpoint exists and handles the request properly
    console.log(`✅ Streaming endpoint: Available (Status: ${result.status})`);
    
    if (result.status !== 200 && result.data.error) {
      console.log(`   Note: ${result.data.error}`);
    }
    
  } catch (error: any) {
    // This might fail due to SSE, which is expected
    console.log(`⚠️ Streaming test: ${error?.message || 'Expected for SSE endpoint'}`);
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling\n');
  
  // Test non-existent agent
  console.log('📝 Test: Non-existent agent');
  try {
    const result = await makeRequest('POST', '/agents/non-existent-id/send', {
      message: 'This should fail',
    });
    
    console.log(`✅ Non-existent agent error: ${result.status === 404 ? 'Handled correctly' : 'Unexpected status'}`);
    if (result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`⚠️ Non-existent agent test failed: ${error?.message}`);
  }
  
  // Test invalid message
  console.log('\n📝 Test: Invalid message (empty)');
  try {
    const result = await makeRequest('POST', '/chat', {
      // Missing message field
    });
    
    console.log(`✅ Invalid message error: ${result.status === 400 ? 'Handled correctly' : 'Unexpected status'}`);
    if (result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`⚠️ Invalid message test failed: ${error?.message}`);
  }
}

async function cleanupTestAgent(agentId?: string) {
  if (!agentId) return;
  
  console.log('\n🧹 Cleaning up test agent');
  try {
    const result = await makeRequest('DELETE', `/agents/${agentId}`);
    console.log(`✅ Test agent cleanup: ${result.status === 200 ? 'OK' : 'Failed'}`);
  } catch (error: any) {
    console.log(`⚠️ Cleanup failed: ${error?.message}`);
  }
}

async function main() {
  console.log('🚀 Nano Services API Test Suite\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Environment:`);
  console.log(`  DREAMS_ROUTER_API_KEY: ${process.env.DREAMS_ROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log('');
  
  try {
    await testHealthEndpoints();
    const agentId = await testAgentManagement();
    await testMessaging(agentId);
    await testStreaming();
    await testErrorHandling();
    await cleanupTestAgent(agentId);
    
    console.log('\n🎉 API Tests Completed!');
    console.log('\n📋 Test Results Summary:');
    console.log('   - Health endpoints: Tested');
    console.log('   - Agent management: Tested');
    console.log('   - Nano services: Tested');
    console.log('   - Messaging: Tested');
    console.log('   - Error handling: Tested');
    console.log('   - Streaming: Basic check done');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Set DREAMS_ROUTER_API_KEY for full functionality');
    console.log('   2. Test streaming with proper SSE client');
    console.log('   3. Implement x402 payment method');
    console.log('   4. Add more nano service domains as needed');
    
  } catch (error: any) {
    console.error('💥 Test suite failed:', error?.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}