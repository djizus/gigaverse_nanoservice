#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "${YELLOW}=== API Validation Tests ===${NC}\n"

# Function to test and display result
test_request() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "${YELLOW}Test: $test_name${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    echo "Data: $data"
    
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_URL$endpoint" 2>/dev/null)
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "Status: $status_code"
    echo "Response: $body"
    
    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL (Expected: $expected_status)${NC}"
    fi
    echo "----------------------------------------"
    echo
}

# 1. Test SendMessageDto Validation
echo -e "${YELLOW}=== SendMessageDto Validation Tests ===${NC}\n"

# First, we need an agent ID - let's create one
echo -e "${YELLOW}Creating test agent...${NC}"
agent_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "modelType": "anthropic",
        "modelId": "claude-3-5-sonnet-latest",
        "name": "Test Agent",
        "description": "Agent for validation testing"
    }' \
    "$API_URL/daydreams/agents")

# Extract agent ID (assuming response contains id field)
agent_id=$(echo "$agent_response" | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -z "$agent_id" ]; then
    agent_id="test-agent-123"
    echo "Using fallback agent ID: $agent_id"
else
    echo "Created agent with ID: $agent_id"
fi
echo

# Test 1.1: Valid message
test_request "Valid SendMessageDto" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    '{
        "content": "Hello, this is a valid message",
        "contextId": "chat",
        "userId": "test-user",
        "sessionId": "550e8400-e29b-41d4-a716-446655440000"
    }' \
    "200"

# Test 1.2: Empty content (should fail)
test_request "Empty content - Should fail" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    '{
        "content": "",
        "contextId": "chat"
    }' \
    "400"

# Test 1.3: Missing content (should fail)
test_request "Missing content - Should fail" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    '{
        "contextId": "chat",
        "userId": "test-user"
    }' \
    "400"

# Test 1.4: Invalid UUID (should fail)
test_request "Invalid UUID sessionId - Should fail" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    '{
        "content": "Test message",
        "sessionId": "not-a-valid-uuid"
    }' \
    "400"

# Test 1.5: Content too long (should fail)
long_content=$(printf 'a%.0s' {1..10001})
test_request "Content exceeds 10000 chars - Should fail" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    "{
        \"content\": \"$long_content\"
    }" \
    "400"

# Test 1.6: Fallback from message to content
test_request "Message fallback to content" \
    "POST" \
    "/daydreams/agents/$agent_id/stream" \
    '{
        "message": "This should work as content",
        "contextId": "chat"
    }' \
    "200"

# 2. Test CreateAgentDto Validation
echo -e "${YELLOW}=== CreateAgentDto Validation Tests ===${NC}\n"

# Test 2.1: Valid agent creation
test_request "Valid CreateAgentDto" \
    "POST" \
    "/daydreams/agents" \
    '{
        "modelType": "anthropic",
        "modelId": "claude-3-5-sonnet-latest",
        "name": "Valid Test Agent",
        "description": "A test agent with valid data",
        "instructions": "You are a helpful assistant",
        "contexts": ["chat"],
        "capabilities": {
            "canBrowseWeb": true,
            "canAccessFiles": false,
            "allowedMcpServers": ["notion", "linear"]
        }
    }' \
    "201"

# Test 2.2: Invalid model type (should fail)
test_request "Invalid modelType - Should fail" \
    "POST" \
    "/daydreams/agents" \
    '{
        "modelType": "invalid-provider",
        "modelId": "some-model",
        "name": "Invalid Agent"
    }' \
    "400"

# Test 2.3: Missing required fields (should fail)
test_request "Missing required fields - Should fail" \
    "POST" \
    "/daydreams/agents" \
    '{
        "name": "Incomplete Agent"
    }' \
    "400"

# Test 2.4: Invalid ID format (should fail)
test_request "Invalid ID format - Should fail" \
    "POST" \
    "/daydreams/agents" \
    '{
        "id": "invalid id with spaces!",
        "modelType": "openai",
        "modelId": "gpt-4",
        "name": "Agent with bad ID"
    }' \
    "400"

# Test 2.5: Name too long (should fail)
long_name=$(printf 'a%.0s' {1..256})
test_request "Name exceeds 255 chars - Should fail" \
    "POST" \
    "/daydreams/agents" \
    "{
        \"modelType\": \"groq\",
        \"modelId\": \"llama-3.1-70b-versatile\",
        \"name\": \"$long_name\"
    }" \
    "400"

# 3. Test UpdateAgentDto Validation
echo -e "${YELLOW}=== UpdateAgentDto Validation Tests ===${NC}\n"

# Test 3.1: Valid partial update
test_request "Valid UpdateAgentDto" \
    "PUT" \
    "/daydreams/agents/$agent_id" \
    '{
        "name": "Updated Agent Name",
        "status": "active"
    }' \
    "200"

# Test 3.2: Invalid status enum (should fail)
test_request "Invalid status enum - Should fail" \
    "PUT" \
    "/daydreams/agents/$agent_id" \
    '{
        "status": "invalid-status"
    }' \
    "400"

# Test 3.3: Update with all optional fields
test_request "Update with all fields" \
    "PUT" \
    "/daydreams/agents/$agent_id" \
    '{
        "name": "Fully Updated Agent",
        "description": "Updated description",
        "modelType": "openai",
        "modelId": "gpt-4-turbo",
        "status": "paused",
        "capabilities": {
            "canBrowseWeb": false,
            "canExecuteCode": true
        }
    }' \
    "200"

# Test 3.4: Empty update (should be allowed)
test_request "Empty update - Should pass" \
    "PUT" \
    "/daydreams/agents/$agent_id" \
    '{}' \
    "200"

echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo "Tests completed. Check the output above for validation behavior."
echo "Green ✓ = Test passed as expected"
echo "Red ✗ = Test failed (unexpected status code)"