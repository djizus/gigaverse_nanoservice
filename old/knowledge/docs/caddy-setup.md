# Caddy HTTPS Setup

## Overview

Caddy provides automatic HTTPS with Let's Encrypt certificates for the API endpoints. It runs as a separate Docker container to avoid conflicts with existing services.

## Architecture

```
Internet (HTTPS)
    ↓
Caddy Proxy (ports 80, 443)
    ├── api-staging.domain.com → localhost:3001 (staging)
    └── api.domain.com → localhost:3000 (production)
```

## Features

- ✅ **Automatic HTTPS**: Let's Encrypt certificates, auto-renewal
- ✅ **Zero-downtime**: Caddy runs independently of app containers
- ✅ **CORS headers**: Automatically added for Vercel deployments
- ✅ **Health checks**: Monitors upstream API availability
- ✅ **Isolated**: Runs in its own Docker network
- ✅ **Safe**: Only exposes APIs on localhost to Caddy

## Setup Instructions

### 1. Initial Setup (One-time)

```bash
# SSH to your VPS
ssh user@your-vps

# Navigate to project
cd /home/knowledge

# Run setup script
sudo DOMAIN=yourdomain.com ./llm-api/scripts/setup-caddy.sh
```

### 2. DNS Configuration

Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | Your-VPS-IP | 300 |
| A | api-staging | Your-VPS-IP | 300 |

### 3. Update Vercel Environment Variables

**Preview/Staging:**
```
VITE_API_URL = https://api-staging.yourdomain.com
```

**Production:**
```
VITE_API_URL = https://api.yourdomain.com
```

## Deployment

Caddy configuration is automatically deployed when you push changes to:
- `llm-api/infra/Caddyfile`
- `llm-api/infra/compose.caddy.yml`

Or manually trigger via GitHub Actions:
1. Go to Actions → Deploy Caddy Proxy
2. Click "Run workflow"
3. Enter your domain
4. Run

## Management Commands

### View Caddy logs
```bash
docker logs caddy-proxy
```

### Reload Caddy configuration
```bash
docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile
```

### Check certificate status
```bash
docker exec caddy-proxy caddy list-certificates
```

### Restart Caddy
```bash
cd /home/knowledge/llm-api/infra
docker compose -f compose.caddy.yml restart
```

### Stop Caddy (emergency)
```bash
cd /home/knowledge/llm-api/infra
docker compose -f compose.caddy.yml down
```

## Troubleshooting

### Certificate not generating
- Check DNS is pointing to your VPS
- Check ports 80 and 443 are open
- Check Caddy logs: `docker logs caddy-proxy`

### Connection refused
- Ensure app containers are running
- Check if apps are bound to localhost: `docker ps`
- Verify network connectivity: `docker network ls`

### CORS errors
- Check Caddyfile has correct origin domains
- Reload Caddy after changes
- Verify with: `curl -I https://api-staging.yourdomain.com/health`

## Security Notes

1. **Localhost binding**: Apps only listen on 127.0.0.1, not exposed directly
2. **HTTPS only**: Caddy automatically redirects HTTP to HTTPS
3. **Rate limiting**: Caddy has built-in rate limiting for Let's Encrypt
4. **Isolated network**: Caddy runs in its own Docker network

## Rollback

To disable Caddy and revert to direct port access:

1. Stop Caddy:
```bash
docker compose -f llm-api/infra/compose.caddy.yml down
```

2. Update docker-compose files to expose ports publicly:
```yaml
ports:
  - '3001:3000'  # Instead of '127.0.0.1:3001:3000'
```

3. Restart app containers:
```bash
docker compose -f llm-api/infra/compose.staging.yml restart
```

4. Update Vercel to use HTTP + IP again