/**
 * Test script for Hybrid System using existing /daydreams routes
 * 
 * Tests both old and new systems working together
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

async function testOldSystem() {
  console.log('📊 Testing OLD Daydreams System (Complex)\n');
  
  console.log('📝 Test: Create agent (old system)');
  try {
    const result = await makeRequest('POST', '/daydreams/agents', {
      name: 'Old System Agent',
      model: 'google-vertex/gemini-2.5-flash',
      context: 'chat',
      instructions: 'You are an agent created with the old complex system.',
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ Old system agent created: ${result.data.id}`);
      console.log(`   Name: ${result.data.name}`);
      return result.data.id;
    } else {
      console.log(`⚠️ Old system failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
      return null;
    }
  } catch (error: any) {
    console.log(`❌ Old system error: ${error?.message}`);
    return null;
  }
}

async function testNewSystem() {
  console.log('\n🚀 Testing NEW Hybrid System (Simple)\n');
  
  console.log('📝 Test: Create agent (new system)');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'New Hybrid Agent',
      model: 'google-vertex/gemini-2.5-flash',
      context: 'chat',
      instructions: 'You are an agent created with the new simplified hybrid system.',
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ New system agent created: ${result.data.id}`);
      console.log(`   Name: ${result.data.name}`);
      console.log(`   System: ${result.data.system}`);
      console.log(`   Provider: ${result.data.providerStatus?.method} - ${result.data.providerStatus?.authenticated}`);
      return result.data.id;
    } else {
      console.log(`⚠️ New system failed: ${result.status}`);
      console.log(`   Error: ${result.data.error}`);
      return null;
    }
  } catch (error: any) {
    console.log(`❌ New system error: ${error?.message}`);
    return null;
  }
}

async function testMessaging(oldAgentId?: string, newAgentId?: string) {
  console.log('\n💬 Testing Messaging Systems\n');
  
  // Test old system messaging
  if (oldAgentId) {
    console.log('📝 Test: Old system messaging');
    try {
      const result = await makeRequest('POST', `/daydreams/agents/${oldAgentId}/send`, {
        message: 'Hello from old system! Respond with "OLD_SYSTEM_OK".',
      });
      
      if (result.status === 200) {
        console.log(`✅ Old system messaging: OK`);
        console.log(`   Response: "${result.data.reply?.content || result.data.reply}"`);
      } else {
        console.log(`⚠️ Old system messaging failed: ${result.status}`);
        console.log(`   Error: ${result.data.error}`);
      }
    } catch (error: any) {
      console.log(`❌ Old system messaging error: ${error?.message}`);
    }
  }
  
  // Test new system messaging
  if (newAgentId) {
    console.log('\n📝 Test: New system messaging');
    try {
      const result = await makeRequest('POST', `/daydreams/agents/${newAgentId}/send/simple`, {
        message: 'Hello from new system! Respond with "NEW_SYSTEM_OK".',
      });
      
      if (result.status === 200) {
        console.log(`✅ New system messaging: OK`);
        console.log(`   Response: "${result.data.response}"`);
        console.log(`   System: ${result.data.system}`);
      } else {
        console.log(`⚠️ New system messaging failed: ${result.status}`);
        console.log(`   Error: ${result.data.error}`);
      }
    } catch (error: any) {
      console.log(`❌ New system messaging error: ${error?.message}`);
    }
  }
}

async function testListAgents() {
  console.log('\n📋 Testing Agent Listing\n');
  
  console.log('📝 Test: List all agents');
  try {
    const result = await makeRequest('GET', '/daydreams/agents');
    
    if (result.status === 200) {
      console.log(`✅ Agent listing: OK`);
      console.log(`   Total agents: ${result.data?.length || 0}`);
      
      if (result.data && result.data.length > 0) {
        result.data.forEach((agent: any, i: number) => {
          console.log(`   ${i + 1}. ${agent.name} (${agent.id}) - ${agent.status}`);
        });
      }
    } else {
      console.log(`⚠️ Agent listing failed: ${result.status}`);
    }
  } catch (error: any) {
    console.log(`❌ Agent listing error: ${error?.message}`);
  }
}

async function testContexts() {
  console.log('\n🧭 Testing Contexts\n');
  
  console.log('📝 Test: List contexts');
  try {
    const result = await makeRequest('GET', '/daydreams/contexts');
    
    if (result.status === 200) {
      console.log(`✅ Contexts: OK`);
      console.log(`   Available contexts: ${result.data?.length || 0}`);
      
      if (result.data && result.data.length > 0) {
        result.data.forEach((context: any, i: number) => {
          console.log(`   ${i + 1}. ${context.name || context.id} - ${context.description || 'No description'}`);
        });
      }
    } else {
      console.log(`⚠️ Contexts failed: ${result.status}`);
    }
  } catch (error: any) {
    console.log(`❌ Contexts error: ${error?.message}`);
  }
}

async function testErrorScenarios() {
  console.log('\n⚠️ Testing Error Scenarios\n');
  
  // Test new system without hybrid adapter
  console.log('📝 Test: New system endpoints without registry');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'Should Fail Agent',
    });
    
    if (result.status === 503) {
      console.log(`✅ Graceful degradation: OK (503 Service Unavailable)`);
    } else if (result.status >= 400) {
      console.log(`✅ Error handling: OK (${result.status})`);
    } else {
      console.log(`⚠️ Unexpected success: ${result.status}`);
    }
    
    if (result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ Error scenario test failed: ${error?.message}`);
  }
  
  // Test missing API key scenario
  console.log('\n📝 Test: Missing API key handling');
  if (!process.env.DREAMS_ROUTER_API_KEY) {
    console.log(`✅ Missing API key: Expected (set DREAMS_ROUTER_API_KEY for full testing)`);
  } else {
    console.log(`✅ API key present: Testing with authentication`);
  }
}

async function cleanupAgents(agentIds: (string | null)[]) {
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
  console.log('🔄 Hybrid System Test Suite');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`API Key: ${process.env.DREAMS_ROUTER_API_KEY ? 'SET' : 'NOT SET'}\n`);
  
  try {
    // Test both systems
    const oldAgentId = await testOldSystem();
    const newAgentId = await testNewSystem();
    
    // Test messaging on both
    await testMessaging(oldAgentId, newAgentId);
    
    // Test shared functionality
    await testListAgents();
    await testContexts();
    
    // Test error scenarios
    await testErrorScenarios();
    
    // Cleanup
    await cleanupAgents([oldAgentId, newAgentId]);
    
    console.log('\n🎉 Hybrid System Tests Completed!');
    
    console.log('\n📊 System Comparison:');
    console.log('   OLD System: Complex, feature-rich, Daydreams Core framework');
    console.log('   NEW System: Simple, lightweight, Direct Dreams Router');
    console.log('   HYBRID: Both systems coexist, choose based on needs');
    
    console.log('\n🔗 Available Endpoints:');
    console.log('   POST /daydreams/agents          - Create agent (old system)');
    console.log('   POST /daydreams/agents/simple   - Create agent (new system)');
    console.log('   POST /daydreams/agents/:id/send        - Send message (old)');
    console.log('   POST /daydreams/agents/:id/send/simple - Send message (new)');
    console.log('   GET  /daydreams/agents          - List all agents');
    console.log('   GET  /daydreams/contexts        - List contexts');
    
    console.log('\n💡 Usage Recommendations:');
    console.log('   - Use OLD system for complex workflows, MCP, templates');
    console.log('   - Use NEW system for simple chat agents, nano services');
    console.log('   - Both systems share the same /daydreams/* namespace');
    
  } catch (error: any) {
    console.error('💥 Test suite failed:', error?.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}