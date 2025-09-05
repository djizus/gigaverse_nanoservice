# DNS and Network Configuration

## Current Architecture (IP + Ports)

We're using direct IP access with different ports for staging and production environments on the same VPS.

### Environment Endpoints

| Environment | Backend API | Frontend | Port |
|------------|-------------|----------|------|
| **Production** | `http://193.203.191.46:3000` | Vercel Production | 3000 |
| **Staging** | `http://193.203.191.46:3001` | Vercel Preview | 3001 |
| **Local Dev** | `http://localhost:3000` | `http://localhost:5173` | 3000 |

### Port Allocation Strategy

- **3000**: Production API (main branch)
- **3001**: Staging API (staging branch)
- **3002-3009**: Reserved for feature branch deployments
- **8000**: ChromaDB (if enabled)
- **80/443**: Reserved for future reverse proxy (Nginx/Caddy)

## Docker Network Isolation

Each environment runs in isolated Docker networks:
- Production: `prod-network`
- Staging: `staging-network`

This ensures complete isolation between environments even on the same VPS.

## Testing Endpoints

### Health Checks
```bash
# Production
curl http://193.203.191.46:3000/health

# Staging
curl http://193.203.191.46:3001/health
```

### API Testing
```bash
# Production API
curl http://193.203.191.46:3000/api/agents

# Staging API
curl http://193.203.191.46:3001/api/agents
```

## Future DNS Configuration (When Ready)

When you're ready to use domain names instead of IP addresses:

### 1. DNS Records to Create

#### On Hostinger (or your DNS provider):

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| A | `api` | `193.203.191.46` | 300 | Production API |
| A | `api-staging` | `193.203.191.46` | 300 | Staging API |
| CNAME | `staging` | `cname.vercel-dns.com` | 300 | Staging Frontend |
| CNAME | `app` | `cname.vercel-dns.com` | 300 | Production Frontend |

### 2. Reverse Proxy Configuration

Once DNS is set up, add a reverse proxy (Caddy recommended) to:
- Route domains to correct ports
- Handle SSL/TLS automatically
- Provide better security

Example Caddy configuration:
```caddyfile
api.yourdomain.com {
    reverse_proxy localhost:3000
}

api-staging.yourdomain.com {
    reverse_proxy localhost:3001
}
```

### 3. Update Environment Variables

After DNS setup, update Vercel environment variables:
- Production: `VITE_API_URL=https://api.yourdomain.com`
- Staging: `VITE_API_URL=https://api-staging.yourdomain.com`

## Migration Path

### Phase 1: Current (IP + Ports) ✅
- Simple setup
- No DNS required
- Direct IP access
- HTTP only

### Phase 2: Add DNS (Optional)
- Add A records pointing to VPS
- Keep using ports initially
- Test domain resolution

### Phase 3: Add Reverse Proxy
- Install Caddy/Nginx
- Configure domain routing
- Enable HTTPS with Let's Encrypt
- Remove port exposure

### Phase 4: Full HTTPS
- Force HTTPS redirect
- Update all environment variables
- Test SSL certificates
- Monitor certificate renewal

## Troubleshooting

### Port Already in Use
```bash
# Check what's using a port
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Docker Network Issues
```bash
# List networks
docker network ls

# Inspect network
docker network inspect prod-network

# Recreate network
docker network rm prod-network
docker network create prod-network
```

### DNS Propagation Check
```bash
# Check DNS resolution
dig api.yourdomain.com
nslookup api.yourdomain.com

# Check from different DNS servers
dig @8.8.8.8 api.yourdomain.com
dig @1.1.1.1 api.yourdomain.com
```

## Security Considerations

### Current Setup (IP + Ports)
- ⚠️ HTTP only (no encryption)
- ⚠️ Ports directly exposed
- ✅ Simple firewall rules
- ✅ Docker network isolation

### Future Setup (DNS + HTTPS)
- ✅ HTTPS encryption
- ✅ Domain-based access control
- ✅ Rate limiting via reverse proxy
- ✅ Better monitoring capabilities

## Rollback Procedures

### Quick Rollback to IP Access
1. Update Vercel env vars to use IP:port
2. Redeploy frontend
3. Remove DNS records if needed
4. Stop reverse proxy if running

### Emergency Access
Always keep IP:port access as backup:
```bash
# Even with DNS, these should work
curl http://193.203.191.46:3000/health
curl http://193.203.191.46:3001/health
```