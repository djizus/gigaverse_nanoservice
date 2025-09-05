#!/bin/bash
# Setup Caddy reverse proxy for HTTPS
# This script is idempotent and can be run multiple times safely

set -e

echo "🔧 Setting up Caddy reverse proxy..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Warning: Not running as root, some commands may fail${NC}"
    # Try to use sudo if available
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        echo -e "${RED}Cannot find sudo and not running as root${NC}"
        exit 1
    fi
else
    SUDO=""  # Already root, no need for sudo
fi

# Get the domain from user or environment
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., example.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain is required${NC}"
    exit 1
fi

echo -e "${GREEN}Using domain: $DOMAIN${NC}"

# Create or recreate caddy network
echo "📦 Setting up Docker network..."
# Remove existing network if it exists and has wrong labels
if $SUDO docker network ls | grep -q caddy-network; then
    echo "Removing existing caddy-network to recreate with correct labels..."
    # Disconnect any containers first
    for container in $($SUDO docker network inspect caddy-network -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true); do
        if [ ! -z "$container" ]; then
            echo "Disconnecting $container from caddy-network..."
            $SUDO docker network disconnect caddy-network $container 2>/dev/null || true
        fi
    done
    # Remove the network
    $SUDO docker network rm caddy-network 2>/dev/null || true
fi
# Let docker-compose create it with correct labels
echo "Network will be created by docker-compose with correct labels"

# Note: We'll connect app containers after Caddy is running

# Update Caddyfile with actual domain
echo "📝 Updating Caddyfile with domain..."
cd /home/knowledge/llm-api/infra

# Check if we need to use host.docker.internal or actual IP
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # On Linux, we need to use the actual host IP
    HOST_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
    if [ -z "$HOST_IP" ]; then
        HOST_IP="172.17.0.1"  # Default Docker bridge IP
    fi
    echo -e "${YELLOW}Linux detected, using host IP: $HOST_IP${NC}"
    
    # Replace host.docker.internal with actual IP in Caddyfile
    sed -i "s/host.docker.internal/$HOST_IP/g" Caddyfile
fi

# Create .env file for Caddy
cat > .env.caddy << EOF
DOMAIN=$DOMAIN
EOF

# Check what's using port 80 and 443
echo "🔍 Checking for port conflicts..."
if $SUDO lsof -i :80 &>/dev/null; then
    echo -e "${YELLOW}Port 80 is already in use by:${NC}"
    $SUDO lsof -i :80 | grep LISTEN || true
    
    # Try to stop nginx if it's running
    if $SUDO systemctl is-active --quiet nginx; then
        echo "📦 Stopping nginx..."
        $SUDO systemctl stop nginx
        $SUDO systemctl disable nginx
    fi
    
    # Check for docker containers using port 80
    if $SUDO docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "0.0.0.0:80|:::80"; then
        echo "📦 Found Docker containers using port 80"
        # Get container names using port 80
        CONTAINERS=$($SUDO docker ps --format "{{.Names}}" --filter "publish=80")
        for container in $CONTAINERS; do
            echo "Stopping container: $container"
            $SUDO docker stop $container || true
        done
    fi
fi

# Stop existing Caddy if running
echo "🛑 Stopping existing Caddy if running..."
$SUDO docker compose -f compose.caddy.yml --env-file .env.caddy down 2>/dev/null || true

# Start Caddy
echo "🚀 Starting Caddy..."
$SUDO docker compose -f compose.caddy.yml --env-file .env.caddy up -d

# Wait for Caddy to start
echo "⏳ Waiting for Caddy to start..."
sleep 5

# Check if Caddy is running
if $SUDO docker ps | grep -q caddy-proxy; then
    echo -e "${GREEN}✅ Caddy is running!${NC}"
    
    # Now connect app containers to Caddy network
    echo "🔗 Connecting app containers to Caddy network..."
    if $SUDO docker ps | grep -q llm-api-staging; then
        $SUDO docker network connect caddy-network llm-api-staging 2>/dev/null || echo "Staging already connected"
    fi
    if $SUDO docker ps | grep -q llm-api-prod; then
        $SUDO docker network connect caddy-network llm-api-prod 2>/dev/null || echo "Production already connected"
    fi
    
    # Show the URLs
    echo ""
    echo "🌐 Your APIs are now available at:"
    echo -e "${GREEN}  • https://api-staging.$DOMAIN (→ port 3001)${NC}"
    echo -e "${GREEN}  • https://api.$DOMAIN (→ port 3000)${NC}"
    echo ""
    echo "📜 Certificates will be automatically obtained from Let's Encrypt"
    echo ""
    
    # Test the endpoints
    echo "🧪 Testing endpoints..."
    sleep 5  # Give Caddy time to get certificates
    
    # Test staging
    if curl -s -o /dev/null -w "%{http_code}" https://api-staging.$DOMAIN/health | grep -q "200\|404"; then
        echo -e "${GREEN}  ✓ Staging endpoint responding${NC}"
    else
        echo -e "${YELLOW}  ⚠ Staging endpoint not responding yet (certificates may still be generating)${NC}"
    fi
    
    # Test production
    if curl -s -o /dev/null -w "%{http_code}" https://api.$DOMAIN/health | grep -q "200\|404"; then
        echo -e "${GREEN}  ✓ Production endpoint responding${NC}"
    else
        echo -e "${YELLOW}  ⚠ Production endpoint not responding yet (certificates may still be generating)${NC}"
    fi
    
    echo ""
    echo "📝 Check logs with: docker logs caddy-proxy"
    echo "🔄 Reload config with: docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile"
else
    echo -e "${RED}❌ Caddy failed to start${NC}"
    echo "Check logs with: docker logs caddy-proxy"
    exit 1
fi