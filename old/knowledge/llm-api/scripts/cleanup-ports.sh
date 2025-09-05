#!/bin/bash
# Script to clean up ports 80 and 443 for Caddy

set -e

echo "🧹 Cleaning up ports 80 and 443..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if root
if [ "$EUID" -ne 0 ]; then 
    SUDO="sudo"
else
    SUDO=""
fi

# Stop nginx if running
if $SUDO systemctl is-active --quiet nginx 2>/dev/null; then
    echo "📦 Stopping nginx..."
    $SUDO systemctl stop nginx
    $SUDO systemctl disable nginx
fi

# Stop apache if running
if $SUDO systemctl is-active --quiet apache2 2>/dev/null; then
    echo "📦 Stopping apache2..."
    $SUDO systemctl stop apache2
    $SUDO systemctl disable apache2
fi

# Find and stop Docker containers using port 80 or 443
echo "🐳 Checking Docker containers..."
CONTAINERS_80=$($SUDO docker ps --format "{{.Names}}" --filter "publish=80" 2>/dev/null || true)
CONTAINERS_443=$($SUDO docker ps --format "{{.Names}}" --filter "publish=443" 2>/dev/null || true)

for container in $CONTAINERS_80 $CONTAINERS_443; do
    if [ "$container" != "caddy-proxy" ]; then
        echo "Stopping container: $container"
        $SUDO docker stop $container || true
    fi
done

# Kill any process using port 80 or 443 (be careful!)
echo "🔍 Checking for other processes..."
if $SUDO lsof -i :80 &>/dev/null; then
    echo -e "${YELLOW}Processes using port 80:${NC}"
    $SUDO lsof -i :80
    
    read -p "Kill these processes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $SUDO fuser -k 80/tcp || true
    fi
fi

if $SUDO lsof -i :443 &>/dev/null; then
    echo -e "${YELLOW}Processes using port 443:${NC}"
    $SUDO lsof -i :443
    
    read -p "Kill these processes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $SUDO fuser -k 443/tcp || true
    fi
fi

echo -e "${GREEN}✅ Ports 80 and 443 should be free now${NC}"
echo "Run 'netstat -tulpn | grep -E ':80|:443'' to verify"