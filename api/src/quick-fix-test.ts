/**
 * Quick test to use the new working system
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

async function testNewSystemOnly() {
  console.log('🚀 Test: Nouveau système seulement (devrait fonctionner)\n');
  
  // 1. Créer un agent avec le nouveau système
  console.log('📝 Étape 1: Créer un agent avec le nouveau système');
  try {
    const result = await makeRequest('POST', '/daydreams/agents/simple', {
      name: 'Agent Test Simple',
      instructions: 'Tu es un assistant utile qui répond en français de façon concise.',
      model: 'anthropic/claude-3-5-sonnet-20241022', // Test avec Anthropic
      routerApiKey: process.env.DREAMS_ROUTER_API_KEY,
    });
    
    if (result.status === 201) {
      console.log(`✅ Agent créé avec succès: ${result.data.id}`);
      console.log(`   Système: ${result.data.system}`);
      console.log(`   Auth: ${result.data.providerStatus?.authenticated}`);
      
      const agentId = result.data.id;
      
      // 2. Envoyer un message avec le nouveau système
      console.log('\n📝 Étape 2: Envoyer un message avec le nouveau système');
      const messageResult = await makeRequest('POST', `/daydreams/agents/${agentId}/send/simple`, {
        message: 'salut',
      });
      
      if (messageResult.status === 200) {
        console.log(`✅ Message envoyé avec succès!`);
        console.log(`   Réponse: "${messageResult.data.response}"`);
        console.log(`   Session: ${messageResult.data.sessionId}`);
        console.log(`   Système: ${messageResult.data.system}`);
        
        // 3. Envoyer un deuxième message dans la même session
        console.log('\n📝 Étape 3: Message de suivi dans la même session');
        const followUpResult = await makeRequest('POST', `/daydreams/agents/${agentId}/send/simple`, {
          message: 'Comment ça va ?',
          sessionId: messageResult.data.sessionId,
        });
        
        if (followUpResult.status === 200) {
          console.log(`✅ Message de suivi réussi!`);
          console.log(`   Réponse: "${followUpResult.data.response}"`);
        } else {
          console.log(`❌ Message de suivi échoué: ${followUpResult.status}`);
          console.log(`   Erreur: ${followUpResult.data.error}`);
        }
        
        // 4. Nettoyer
        console.log('\n📝 Étape 4: Nettoyer l\'agent de test');
        const deleteResult = await makeRequest('DELETE', `/daydreams/agents/${agentId}`);
        console.log(`✅ Nettoyage: ${deleteResult.status === 200 ? 'OK' : 'Échoué'}`);
        
      } else {
        console.log(`❌ Message échoué: ${messageResult.status}`);
        console.log(`   Erreur: ${messageResult.data.error}`);
        
        if (messageResult.data.error?.includes('system')) {
          console.log('💡 Le nouveau système a encore le problème de messages système');
        }
        if (messageResult.data.error?.includes('Unauthorized') || messageResult.data.error?.includes('authentication')) {
          console.log('💡 Problème d\'authentification - vérifier l\'API key');
        }
      }
      
    } else {
      console.log(`❌ Création d'agent échouée: ${result.status}`);
      console.log(`   Erreur: ${result.data.error}`);
      
      if (result.data.error?.includes('Hybrid system not available')) {
        console.log('💡 Le système hybride n\'est pas activé - redémarrer le serveur');
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Test échoué: ${error?.message}`);
  }
}

async function main() {
  console.log('⚡ Test rapide du nouveau système');
  console.log(`Serveur: ${BASE_URL}`);
  console.log(`API Key: ${process.env.DREAMS_ROUTER_API_KEY ? 'CONFIGURÉE' : 'MANQUANTE'}\n`);
  
  if (!process.env.DREAMS_ROUTER_API_KEY) {
    console.log('❌ DREAMS_ROUTER_API_KEY requise');
    process.exit(1);
  }
  
  await testNewSystemOnly();
  
  console.log('\n🎯 Résumé:');
  console.log('   - Le nouveau système (/simple) évite les problèmes de l\'ancien');
  console.log('   - Utilise directement l\'API Dreams Router');
  console.log('   - Pas de runtime Daydreams Core problématique');
  console.log('   - Messages formatés correctement pour Anthropic');
}

if (require.main === module) {
  main();
}