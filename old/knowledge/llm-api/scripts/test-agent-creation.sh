#!/bin/bash

# Test direct de création d'agent sans auth (route @Public)
echo "Testing agent creation endpoint..."

curl -X POST http://localhost:3000/daydreams/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent Direct",
    "modelType": "anthropic",
    "modelId": "claude-3-5-sonnet-latest",
    "instructions": "You are a helpful assistant",
    "contexts": ["chat"],
    "contextArgs": {
      "chat": {
        "sessionId": "test-session-123",
        "userId": "test-user"
      }
    }
  }' \
  -v