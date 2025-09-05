#!/bin/bash

# Test deployed Docker images from GitHub Registry
# Usage: ./test-deployed.sh [branch]

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BRANCH=${1:-develop}
REGISTRY="ghcr.io"
IMAGE="$REGISTRY/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/llm-api"
PORT=${2:-3001}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    TESTING DEPLOYED IMAGE: $BRANCH                             ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Pull latest image
echo -e "${YELLOW}Pulling latest image for $BRANCH...${NC}"
docker pull $IMAGE:$BRANCH || {
    echo -e "${RED}Failed to pull image. Make sure you're logged in:${NC}"
    echo "  docker login ghcr.io -u YOUR_GITHUB_USERNAME"
    exit 1
}

# Stop existing container
docker stop test-$BRANCH 2>/dev/null || true
docker rm test-$BRANCH 2>/dev/null || true

# Start container
echo -e "${BLUE}Starting container on port $PORT...${NC}"
docker run -d \
    --name test-$BRANCH \
    -p $PORT:3001 \
    -e PORT=3001 \
    -e NODE_ENV=test \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_API_KEY="$SUPABASE_API_KEY" \
    -e MEMORY_TYPE=in-memory \
    $IMAGE:$BRANCH

# Wait for API
echo "Waiting for API..."
sleep 5
timeout 30 bash -c "until curl -s http://localhost:$PORT/health > /dev/null; do sleep 1; done"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API is ready${NC}\n"
else
    echo -e "${RED}✗ API failed to start${NC}"
    docker logs test-$BRANCH
    exit 1
fi

# Run tests
echo -e "${BLUE}Running tests...${NC}"
cd llm-api/scripts/test
./run-all-tests.sh --no-server --port $PORT

echo ""
echo -e "${YELLOW}Container is still running as 'test-$BRANCH'${NC}"
echo "  Logs: docker logs -f test-$BRANCH"
echo "  Stop: docker stop test-$BRANCH && docker rm test-$BRANCH"