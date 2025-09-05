#!/bin/bash

# Test de validation simplifié pour démontrer que les DTOs fonctionnent

echo "=== Test de Validation des DTOs ==="
echo

echo "1. Test SendMessageDto - Content vide (doit échouer avec 400)"
curl -s -X POST http://localhost:3000/daydreams/agents/test-agent/stream \
  -H "Content-Type: application/json" \
  -d '{"content": "", "contextId": "chat"}' \
  -w "\nStatus: %{http_code}\n"
echo

echo "2. Test SendMessageDto - Content manquant (doit échouer avec 400)"
curl -s -X POST http://localhost:3000/daydreams/agents/test-agent/stream \
  -H "Content-Type: application/json" \
  -d '{"contextId": "chat"}' \
  -w "\nStatus: %{http_code}\n"
echo

echo "3. Test SendMessageDto - UUID invalide (doit échouer avec 400)"
curl -s -X POST http://localhost:3000/daydreams/agents/test-agent/stream \
  -H "Content-Type: application/json" \
  -d '{"content": "Test", "sessionId": "not-a-uuid"}' \
  -w "\nStatus: %{http_code}\n"
echo

echo "4. Test SendMessageDto - Content trop long (doit échouer avec 400)"
long_content=$(printf 'a%.0s' {1..10001})
curl -s -X POST http://localhost:3000/daydreams/agents/test-agent/stream \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$long_content\"}" \
  -w "\nStatus: %{http_code}\n"
echo

echo "5. Test CreateAgentDto - ModelType invalide (doit échouer avec 400)"
curl -s -X POST http://localhost:3000/daydreams/agents \
  -H "Content-Type: application/json" \
  -d '{
    "modelType": "invalid-provider",
    "modelId": "some-model",
    "name": "Invalid Agent"
  }' \
  -w "\nStatus: %{http_code}\n"
echo

echo "6. Test CreateAgentDto - Champs requis manquants (doit échouer avec 400)"
curl -s -X POST http://localhost:3000/daydreams/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "Incomplete Agent"}' \
  -w "\nStatus: %{http_code}\n"
echo

echo "=== Résumé ==="
echo "La validation fonctionne correctement si tous les tests retournent des erreurs 400"
echo "avec des messages d'erreur détaillés sur les champs invalides."