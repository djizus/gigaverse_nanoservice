#!/bin/bash

# Deploy and test multiple branches simultaneously
# Usage: ./deploy-and-test.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BRANCHES=("master:3001" "develop:3002" "contextfactory:3003")

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}                    MULTI-BRANCH DEPLOYMENT & TESTING                           ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "$1" in
    deploy)
        echo -e "${BLUE}Deploying all branches...${NC}\n"
        
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            echo -e "${YELLOW}Deploying $branch on port $port...${NC}"
            
            # Checkout and build
            git checkout $branch
            cd llm-api
            docker build -t llm-api:$branch .
            
            # Stop existing container
            docker stop llm-api-$port 2>/dev/null || true
            docker rm llm-api-$port 2>/dev/null || true
            
            # Start new container
            docker run -d \
                --name llm-api-$port \
                -p $port:3001 \
                -e PORT=3001 \
                -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
                -e SUPABASE_URL="$SUPABASE_URL" \
                -e SUPABASE_API_KEY="$SUPABASE_API_KEY" \
                -e MEMORY_TYPE=in-memory \
                llm-api:$branch
            
            echo -e "${GREEN}✓ $branch deployed on port $port${NC}\n"
            cd ..
        done
        
        echo -e "${GREEN}All branches deployed!${NC}"
        echo ""
        echo "APIs running on:"
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            echo "  - $branch: http://localhost:$port"
        done
        ;;
        
    test)
        echo -e "${BLUE}Testing all deployed branches...${NC}\n"
        
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            echo -e "${YELLOW}Testing $branch on port $port...${NC}"
            
            # Check if API is running
            if curl -s http://localhost:$port/health > /dev/null 2>&1; then
                cd llm-api/scripts/test
                API_URL=http://localhost:$port ./run-all-tests.sh --no-server --port $port > /tmp/test-$branch.log 2>&1
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ $branch tests passed${NC}"
                else
                    echo -e "${RED}✗ $branch tests failed${NC}"
                    echo "  See /tmp/test-$branch.log for details"
                fi
                cd ../../..
            else
                echo -e "${RED}✗ $branch API not running on port $port${NC}"
            fi
            echo ""
        done
        ;;
        
    stop)
        echo -e "${BLUE}Stopping all branch deployments...${NC}\n"
        
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            echo -e "${YELLOW}Stopping $branch on port $port...${NC}"
            docker stop llm-api-$port 2>/dev/null || true
            docker rm llm-api-$port 2>/dev/null || true
        done
        
        echo -e "${GREEN}All deployments stopped${NC}"
        ;;
        
    status)
        echo -e "${BLUE}Branch deployment status:${NC}\n"
        
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            if docker ps | grep -q llm-api-$port; then
                if curl -s http://localhost:$port/health > /dev/null 2>&1; then
                    echo -e "  ${GREEN}✓${NC} $branch on port $port - Running and healthy"
                else
                    echo -e "  ${YELLOW}⚠${NC}  $branch on port $port - Container running but API not responding"
                fi
            else
                echo -e "  ${RED}✗${NC} $branch on port $port - Not running"
            fi
        done
        ;;
        
    *)
        echo "Usage: $0 {deploy|test|stop|status}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Build and deploy all branches"
        echo "  test    - Run tests on all deployed branches"
        echo "  stop    - Stop all deployments"
        echo "  status  - Show status of all deployments"
        echo ""
        echo "Configured branches:"
        for branch_config in "${BRANCHES[@]}"; do
            IFS=':' read -r branch port <<< "$branch_config"
            echo "  - $branch on port $port"
        done
        exit 1
        ;;
esac