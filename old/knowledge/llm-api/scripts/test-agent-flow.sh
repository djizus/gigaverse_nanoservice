#!/bin/bash

# Test script for agent creation and message flow
# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API endpoint
API_URL="http://localhost:3000"
TOKEN=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to format JSON
format_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# Test 1: Login (if needed)
test_login() {
    print_status "Testing login..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "password123"
        }')
    
    if echo "$RESPONSE" | grep -q "access_token"; then
        TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
        print_success "Login successful"
        echo "Token: ${TOKEN:0:20}..."
    else
        print_warning "Login failed - continuing with public endpoints"
        format_json "$RESPONSE"
    fi
}

# Test 2: Create Agent (Direct - no template)
test_create_agent_direct() {
    print_status "Testing direct agent creation..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
        -d '{
            "name": "Test Agent Direct",
            "modelType": "anthropic",
            "modelId": "claude-3-5-sonnet-latest",
            "instructions": "You are a helpful assistant for testing purposes.",
            "contexts": ["chat"],
            "contextArgs": {
                "chat": {
                    "sessionId": "test-session-'$(date +%s)'",
                    "userId": "test-user"
                }
            }
        }')
    
    if echo "$RESPONSE" | grep -q "agentId"; then
        AGENT_ID=$(echo "$RESPONSE" | grep -o '"agentId":"[^"]*' | sed 's/"agentId":"//')
        print_success "Agent created successfully: $AGENT_ID"
        format_json "$RESPONSE"
        echo "$AGENT_ID" > .test_agent_id
    else
        print_error "Failed to create agent"
        format_json "$RESPONSE"
        return 1
    fi
}

# Test 3: List Agents
test_list_agents() {
    print_status "Testing agent listing..."
    
    RESPONSE=$(curl -s -X GET "$API_URL/daydreams/agents" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
    
    if echo "$RESPONSE" | grep -q "agents"; then
        print_success "Agents listed successfully"
        format_json "$RESPONSE"
    else
        print_error "Failed to list agents"
        format_json "$RESPONSE"
    fi
}

# Test 4: Get Specific Agent
test_get_agent() {
    print_status "Testing get specific agent..."
    
    if [ ! -f .test_agent_id ]; then
        print_warning "No agent ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    
    RESPONSE=$(curl -s -X GET "$API_URL/daydreams/agents/$AGENT_ID" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
    
    if echo "$RESPONSE" | grep -q "success"; then
        print_success "Agent retrieved successfully"
        format_json "$RESPONSE"
    else
        print_error "Failed to get agent"
        format_json "$RESPONSE"
    fi
}

# Test 5: Send Message (Non-streaming)
test_send_message() {
    print_status "Testing message sending (non-streaming)..."
    
    if [ ! -f .test_agent_id ]; then
        print_warning "No agent ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    SESSION_ID="session-$(date +%s)"
    
    RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents/$AGENT_ID/send" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
        -d '{
            "content": "Hello, can you tell me a short joke?",
            "sessionId": "'$SESSION_ID'",
            "contextId": "chat",
            "userId": "test-user"
        }')
    
    if echo "$RESPONSE" | grep -q "success"; then
        print_success "Message sent successfully"
        format_json "$RESPONSE"
        echo "$SESSION_ID" > .test_session_id
    else
        print_error "Failed to send message"
        format_json "$RESPONSE"
    fi
}

# Test 6: Send Message (Streaming)
test_send_message_streaming() {
    print_status "Testing message sending (streaming)..."
    
    if [ ! -f .test_agent_id ]; then
        print_warning "No agent ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    SESSION_ID=${1:-"session-$(date +%s)"}
    
    print_status "Sending streaming request to agent $AGENT_ID..."
    
    # Use curl with -N for no buffering to see SSE events as they arrive
    curl -N -X POST "$API_URL/daydreams/agents/$AGENT_ID/stream" \
        -H "Content-Type: application/json" \
        -H "Accept: text/event-stream" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
        -d '{
            "content": "Write me a haiku about programming",
            "sessionId": "'$SESSION_ID'",
            "contextId": "chat",
            "userId": "test-user"
        }' 2>/dev/null | while IFS= read -r line; do
        if [[ $line == data:* ]]; then
            echo -e "${GREEN}SSE:${NC} ${line:5}"
        fi
    done
    
    echo "$SESSION_ID" > .test_session_id
}

# Test 7: Get Conversations
test_get_conversations() {
    print_status "Testing get conversations..."
    
    if [ ! -f .test_agent_id ]; then
        print_warning "No agent ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    
    RESPONSE=$(curl -s -X GET "$API_URL/daydreams/agents/$AGENT_ID/memory/conversations" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
    
    if echo "$RESPONSE" | grep -q "conversations"; then
        print_success "Conversations retrieved successfully"
        format_json "$RESPONSE"
    else
        print_error "Failed to get conversations"
        format_json "$RESPONSE"
    fi
}

# Test 8: Get Messages from Conversation
test_get_messages() {
    print_status "Testing get messages from conversation..."
    
    if [ ! -f .test_agent_id ] || [ ! -f .test_session_id ]; then
        print_warning "No agent ID or session ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    SESSION_ID=$(cat .test_session_id)
    
    RESPONSE=$(curl -s -X GET "$API_URL/daydreams/agents/$AGENT_ID/memory/conversations/$SESSION_ID/messages" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
    
    if echo "$RESPONSE" | grep -q "messages"; then
        print_success "Messages retrieved successfully"
        format_json "$RESPONSE"
    else
        print_error "Failed to get messages"
        format_json "$RESPONSE"
    fi
}

# Test 9: Create Agent with Template
test_create_agent_template() {
    print_status "Testing agent creation with template..."
    
    # First, get available templates
    print_status "Getting available templates..."
    TEMPLATES=$(curl -s -X GET "$API_URL/daydreams/templates" \
        -H "Content-Type: application/json")
    
    echo "Available templates:"
    format_json "$TEMPLATES"
    
    # Try to create agent with first template if available
    TEMPLATE_ID=$(echo "$TEMPLATES" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
    
    if [ -n "$TEMPLATE_ID" ]; then
        print_status "Creating agent with template: $TEMPLATE_ID"
        
        RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents" \
            -H "Content-Type: application/json" \
            ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
            -d '{
                "templateId": "'$TEMPLATE_ID'",
                "name": "Test Agent from Template",
                "modelType": "anthropic",
                "modelId": "claude-3-5-sonnet-latest"
            }')
        
        if echo "$RESPONSE" | grep -q "agentId"; then
            print_success "Agent created from template successfully"
            format_json "$RESPONSE"
        else
            print_error "Failed to create agent from template"
            format_json "$RESPONSE"
        fi
    else
        print_warning "No templates available"
    fi
}

# Test 10: Delete Agent
test_delete_agent() {
    print_status "Testing agent deletion..."
    
    if [ ! -f .test_agent_id ]; then
        print_warning "No agent ID found, skipping test"
        return
    fi
    
    AGENT_ID=$(cat .test_agent_id)
    
    RESPONSE=$(curl -s -X DELETE "$API_URL/daydreams/agents/$AGENT_ID" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
    
    if echo "$RESPONSE" | grep -q "success"; then
        print_success "Agent deleted successfully"
        format_json "$RESPONSE"
        rm -f .test_agent_id .test_session_id
    else
        print_error "Failed to delete agent"
        format_json "$RESPONSE"
    fi
}

# Test validation errors
test_validation_errors() {
    print_status "Testing validation errors..."
    
    # Test missing required fields
    print_status "Test 1: Missing modelType"
    RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
        -d '{
            "name": "Invalid Agent",
            "instructions": "This should fail"
        }')
    format_json "$RESPONSE"
    
    # Test invalid modelType
    print_status "Test 2: Invalid modelType"
    RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents" \
        -H "Content-Type: application/json" \
        ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
        -d '{
            "name": "Invalid Agent",
            "modelType": "invalid-type",
            "modelId": "gpt-4"
        }')
    format_json "$RESPONSE"
    
    # Test missing content in message
    print_status "Test 3: Missing message content"
    if [ -f .test_agent_id ]; then
        AGENT_ID=$(cat .test_agent_id)
        RESPONSE=$(curl -s -X POST "$API_URL/daydreams/agents/$AGENT_ID/send" \
            -H "Content-Type: application/json" \
            ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
            -d '{
                "sessionId": "test-session"
            }')
        format_json "$RESPONSE"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}=== Agent API Test Suite ===${NC}"
    echo "1. Run all tests"
    echo "2. Test login"
    echo "3. Create agent (direct)"
    echo "4. List agents"
    echo "5. Get specific agent"
    echo "6. Send message (non-streaming)"
    echo "7. Send message (streaming)"
    echo "8. Get conversations"
    echo "9. Get messages"
    echo "10. Create agent (template)"
    echo "11. Delete agent"
    echo "12. Test validation errors"
    echo "0. Exit"
    echo -n "Select test: "
}

# Run tests based on selection
run_tests() {
    case $1 in
        1)
            test_login
            test_create_agent_direct
            test_list_agents
            test_get_agent
            test_send_message
            test_get_conversations
            test_get_messages
            test_delete_agent
            ;;
        2) test_login ;;
        3) test_create_agent_direct ;;
        4) test_list_agents ;;
        5) test_get_agent ;;
        6) test_send_message ;;
        7) test_send_message_streaming ;;
        8) test_get_conversations ;;
        9) test_get_messages ;;
        10) test_create_agent_template ;;
        11) test_delete_agent ;;
        12) test_validation_errors ;;
        0) exit 0 ;;
        *) print_error "Invalid selection" ;;
    esac
}

# Check if running with arguments
if [ $# -gt 0 ]; then
    run_tests $1
else
    # Interactive mode
    while true; do
        show_menu
        read choice
        run_tests $choice
    done
fi