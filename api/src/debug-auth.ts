/**
 * Debug script to test authentication issues
 */

import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

async function testAuthentication() {
  console.log('🔍 Debugging Dreams Router Authentication\n');
  
  console.log('Environment:');
  console.log(`  DREAMS_ROUTER_API_KEY: ${process.env.DREAMS_ROUTER_API_KEY ? 'SET (length: ' + process.env.DREAMS_ROUTER_API_KEY.length + ')' : 'NOT SET'}`);
  
  if (!process.env.DREAMS_ROUTER_API_KEY) {
    console.log('\n❌ DREAMS_ROUTER_API_KEY is not set!');
    console.log('Set it with: export DREAMS_ROUTER_API_KEY="your-api-key"');
    return;
  }
  
  console.log('\n🧪 Testing direct API key with Dreams Router...');
  
  try {
    const { createDreamsRouter } = await import('@daydreamsai/ai-sdk-provider');
    const { generateText } = await import('ai');
    
    const router = createDreamsRouter({ apiKey: process.env.DREAMS_ROUTER_API_KEY! });
    const model = router('google-vertex/gemini-2.5-flash');
    
    console.log('✅ Dreams Router created successfully');
    
    const result = await generateText({
      model,
      prompt: 'Say "AUTH_TEST_OK" if authentication works',
      temperature: 0,
    });
    
    console.log(`✅ Authentication test successful!`);
    console.log(`   Response: "${result.text}"`);
    
  } catch (error: any) {
    console.log(`❌ Authentication test failed!`);
    console.log(`   Error: ${error?.message}`);
    console.log(`   Status: ${error?.statusCode}`);
    console.log(`   URL: ${error?.url}`);
    
    if (error?.responseBody) {
      console.log(`   Response: ${error.responseBody}`);
    }
    
    if (error?.statusCode === 401) {
      console.log('\n💡 Troubleshooting 401 Unauthorized:');
      console.log('   1. Check if your API key is valid');
      console.log('   2. Check if your API key has proper permissions');
      console.log('   3. Check if your account has credits/usage remaining');
      console.log('   4. Try generating a new API key from the Daydreams dashboard');
    }
  }
  
  console.log('\n📞 Testing API call directly...');
  
  try {
    const response = await fetch('https://api-beta.daydreams.systems/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DREAMS_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google-vertex/gemini-2.5-flash',
        messages: [
          { role: 'user', content: 'Say "DIRECT_API_OK"' }
        ],
        temperature: 0,
        max_tokens: 10,
      }),
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok) {
      console.log('✅ Direct API call successful!');
    } else {
      console.log('❌ Direct API call failed');
    }
    
  } catch (error: any) {
    console.log(`❌ Direct API call error: ${error?.message}`);
  }
}

async function main() {
  console.log('🚀 Dreams Router Authentication Debug\n');
  
  try {
    await testAuthentication();
    
    console.log('\n📋 Summary:');
    console.log('   If authentication works here but fails in the app,');
    console.log('   the issue is likely in how the API key is passed to agents.');
    
  } catch (error: any) {
    console.error('💥 Debug failed:', error?.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
