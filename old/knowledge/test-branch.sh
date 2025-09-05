#!/bin/bash

# Test any branch of the API
# Usage: ./test-branch.sh [branch-name]

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get branch name (default to current branch)
BRANCH=${1:-$(git rev-parse --abbrev-ref HEAD)}
PORT=${2:-3001}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                         TESTING BRANCH: $BRANCH                                ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# If different branch, checkout
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "$CURRENT_BRANCH" ]; then
    echo -e "${YELLOW}Switching to branch $BRANCH...${NC}"
    git checkout $BRANCH
fi

# Build and start the API for this branch
echo -e "${BLUE}Building API for branch $BRANCH...${NC}"
cd llm-api

# Build Docker image
docker build -t llm-api:$BRANCH .

# Stop any existing container on this port
docker stop llm-api-$PORT 2>/dev/null || true
docker rm llm-api-$PORT 2>/dev/null || true

# Start API
echo -e "${BLUE}Starting API on port $PORT...${NC}"
docker run -d \
    --name llm-api-$PORT \
    -p $PORT:3001 \
    -e PORT=3001 \
    -e NODE_ENV=test \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_API_KEY="$SUPABASE_API_KEY" \
    -e MEMORY_TYPE=in-memory \
    llm-api:$BRANCH

# Wait for API to be ready
echo "Waiting for API to start..."
sleep 5
MAX_ATTEMPTS=30
ATTEMPTS=0
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is ready on port $PORT${NC}\n"
        break
    fi
    sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}✗ API failed to start${NC}"
    docker logs llm-api-$PORT
    exit 1
fi

# Run tests
echo -e "${BLUE}Running tests...${NC}\n"
cd scripts/test
chmod +x *.sh
API_URL=http://localhost:$PORT ./run-all-tests.sh --no-server --port $PORT

TEST_RESULT=$?

# Show summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed for branch $BRANCH on port $PORT${NC}"
else
    echo -e "${RED}✗ Tests failed for branch $BRANCH${NC}"
fi

echo ""
echo -e "${YELLOW}API is still running on port $PORT${NC}"
echo "  View logs: docker logs -f llm-api-$PORT"
echo "  Stop it:  docker stop llm-api-$PORT && docker rm llm-api-$PORT"
echo ""

# Return to original branch if we switched
if [ "$BRANCH" != "$CURRENT_BRANCH" ]; then
    git checkout $CURRENT_BRANCH
fi

exit $TEST_RESULT