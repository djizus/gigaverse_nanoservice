# API: Namespaced Nano‑Services (Gigaverse + Loot Survivor)

The API hosts multiple independent nano‑services behind a single Hono server using a Service Registry and namespaced routes. Built‑in services:

- Gigaverse: real‑time dungeon runner (agent‑driven decisions, Supabase events)
- Loot Survivor: read‑only Torii context + basic run logger (no on‑chain execution yet)

## Features

- 🏰 **Real-time Dungeon Runs**: Automated Gigaverse dungeon execution with live event streaming
- 💰 **Micropayments**: $0.01 per dungeon run using x402 on Base Sepolia
- ⚡ **Live Updates**: Real-time event logging to Supabase for immediate client updates
- 🧠 **Daydreams Agent Decisions**: Agent-only combat and loot decisions via Daydreams Router (no fallback)
- 🛡️ **Duplicate Prevention**: Prevents double charging with 5-minute timeout recovery
- 🔄 **Multi-Run Support**: Execute multiple dungeon runs in a single paid request
- 🚀 **Production Ready**: Built with Hono, deployed on Google Cloud Run

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up the database (Supabase/Postgres):

```bash
# Create database tables (Supabase or PostgreSQL)
# Fresh install
psql -d your_database -f database/schema.sql

# Upgrading existing DB
psql -d your_database -f database/migrations/20250907_ns_services.sql
```

3. Create a `.env` file with your configuration:

```env
# x402 Payment Configuration
FACILITATOR_URL=https://facilitator.x402.rs
ADDRESS=0xYourPaymentAddress  # Ethereum address to receive payments
NETWORK=base-sepolia
PRIVATE_KEY=0xYourPrivateKey  # For client-side payment signing

# Supabase Configuration (Real-time Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key_here

# Optional
PORT=4021  # Default service port

# LS Torii (Loot Survivor)
TORII_URL=https://api.cartridge.gg/x/pg-sepolia/torii
NAMESPACE=ls_0_0_6
```

4. Run the server:

```bash
bun run dev     # Development server
bun run start   # Production server
```

The server will start on port 4021.

## API Endpoints

### GET `/` - Service Info (Free)

Returns information about the service and available endpoints.

### GET `/health` - Health Check (Free)

Returns the service status and database connectivity.

### POST `/dungeon` - Start Dungeon Runs ($0.01 per run)

Execute automated dungeon runs with real-time event logging.

**Request Body:**

```json
{
  "context": "Be aggressive in combat, prioritize attack upgrades when looting",
  "playerAddress": "0xE0CBF5Ef2B9E52A9CcC084a6Ab5e48E0E955C9b1",
  "gigaverseToken": "eyJhbGciOiJIUzI1NiJ9...",
  "totalRuns": 3,
  "dungeonId": 1,
  "isJuiced": false,
  "consumables": [],
  "gearInstanceIds": []
}
```

**Response (Immediate):**

```json
{
  "runId": "09c133df-0f47-49f3-8784-3db6061c4957",
  "status": "started", 
  "message": "Dungeon run started! Subscribe to real-time updates for runId: 09c133df-...",
  "payment": {
    "totalPrice": 0.03,
    "pricePerRun": 0.01,
    "currency": "USD"
  },
  "instructions": {
    "message": "Subscribe to real-time updates using the runId",
    "subscription": "Subscribe to table 'run_events' with filter 'dungeon_run_id=eq.09c133df-...'"
  }
}
```

## Example Usage

### Running Dungeon Tests

```bash
# Run basic dungeon request
bun run client

# Run with payment examples  
bun run client:examples

# Test deployed service health
bun run test:deployed
```

### Daydreams (Agents) PoC

- `GET /daydreams/contexts` — List available contexts (`chat`, `gigaverse`)
- `GET /daydreams/agents` — List agents
- `POST /daydreams/agents` — Create agent
- `GET /daydreams/agents/:id` — Get agent
- `DELETE /daydreams/agents/:id` — Delete agent
- `POST /daydreams/agents/:id/send` — Send a message (creates session if missing)
- `GET /daydreams/agents/:id/sessions` — List sessions for an agent
- `GET /daydreams/sessions/:sessionId/messages` — List messages in a session

Auth and user scoping:
- These endpoints are user-scoped. Provide `Authorization: Bearer <supabase-jwt>`.
- Dev mode: with `DAYDREAMS_USE_MEMORY=true`, you may use `X-User-Id: <uid>` header instead.

Request example for creating an agent:

```json
{
  "name": "My Agent",
  "model": "gpt-4o-mini",
  "context": "gigaverse",
  "instructions": "Be helpful"
}
```

Request example for sending a message:

```json
{
  "message": "Hello",
  "sessionId": "optional-existing-session-id"
}
```

Notes:
- PoC responses are stubbed without calling external LLMs. Persistence is backed by Supabase in production and falls back to in-memory when `DAYDREAMS_USE_MEMORY=true` (useful for tests/dev without DB).
- Database schema for agents is in `database/daydreams.schema.sql`.
 - Migration adds `user_id` on `agents` and `sessions` (see `database/migrations/20250908_user_scoping.sql`).


### Real-time Event Subscription

After starting a dungeon run, subscribe to live updates using the returned `runId`:

```javascript
// Supabase real-time subscription
const supabase = createClient(supabaseUrl, supabaseKey);

supabase
  .channel('dungeon-events')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'run_events',
      filter: `dungeon_run_id=eq.${runId}`
    }, 
    (payload) => {
      const { event_type, message, event_data } = payload.new;
      console.log(`[${event_type}] ${message}`, event_data);
    }
  )
  .subscribe();
```

### Event Types

- `run_started` - Dungeon run begins
- `room_entered` - Player enters new room  
- `combat_move` - Combat action taken
- `battle_result` - Combat outcome
- `room_cleared` - Room completed successfully
- `loot_selected` - Loot choice made
- `run_completed` - Individual run finished
- `all_runs_completed` - All runs in session finished
- `error` - Error occurred during run
- `agent_decision_move` - Daydreams agent returned a move
- `agent_decision_loot` - Daydreams agent returned a loot choice
- `agent_error` - Daydreams agent failed (timeout/validation/provider)

## How It Works

1. **Client Request**: Player submits dungeon run request with payment
2. **Duplicate Check**: Service checks for existing active runs (prevents double charging)  
3. **Payment Processing**: x402 middleware handles USDC payment on Base Sepolia
4. **Immediate Response**: Service returns runId and subscription instructions
5. **Background Execution**: Dungeon runs execute asynchronously with real-time logging
6. **Live Updates**: All events streamed to Supabase for real-time client updates

## Architecture Flow

```
Client Request → Pricing Middleware → x402 Payment → Dungeon Controller → Background Processing
                     ↓                      ↓                ↓                       ↓
                Calculate Price    Process USDC Payment  Return runId      Agent-Driven Game Execution
                 ($0.01 per run)    (Base Sepolia Network)      ↓                       ↓
                                                        Client Subscribes → Real-time Database Events
                                                        (Supabase Realtime)    (Combat, Loot, Progress)
```

## Database Schema

- **`dungeon_runs`** - Main run sessions with status tracking
- **`run_logs`** - Individual run details within a session  
- **`run_events`** - Real-time events (combat moves, loot selection, room progression)

If upgrading from a previous version, update the `run_events.event_type` constraint to include agent events:

```sql
ALTER TABLE run_events DROP CONSTRAINT IF EXISTS run_events_event_type_check;
ALTER TABLE run_events ADD CONSTRAINT run_events_event_type_check CHECK (
  event_type IN (
    'run_started','room_entered','combat_move','battle_result','loot_phase','loot_selected','room_cleared','run_completed','all_runs_completed','error','agent_decision_move','agent_decision_loot','agent_error'
  )
);
```

## Customization

You can customize:

- **Pricing**: Modify pricing logic in `src/domains/payment/pricing.service.ts`
- **Combat Strategy**: Update heuristics in `src/domains/gigaverse/gigaverse.utils.ts`
- **Event Logging**: Add custom events in `src/domains/dungeon/dungeon.service.ts`
- **Database Schema**: Extend tables in `database/schema.sql`
- **Middleware**: Add custom validation or processing steps

## Features

### Duplicate Prevention
- Prevents multiple active runs for same player
- 5-minute timeout for crashed agents (auto-recovery)
- Smart detection of different dungeon conflicts

### Daydreams Agent Mode
- Enable by setting `DREAMS_ROUTER_API_KEY`.
- Default model: `google-vertex/gemini-2.5-flash` (UI can select a different model).
- Fixed timeout: `8000ms`.
- Behavior: If the agent is disabled, times out, or returns invalid output, the run fails immediately (no fallback).
- Health: `/health` includes agent `enabled`, `model`, and `timeoutMs`.
- **Combat Strategy**: Smart rock/paper/scissors based on enemy patterns  
- **Loot Selection**: Prioritizes upgrades based on player strategy
- **Risk Management**: Health/shield monitoring for survival

## Deployment to Google Cloud Run

### Quick Deploy

1. Set up your environment:

```bash
# Create production environment file
cp .env .env.production

# Edit .env.production with your production keys
vim .env.production
```

2. Deploy to Cloud Run:

```bash
# Deploy with default settings (daydreams-labs-staging project)
bun run deploy

# Or deploy to your own GCP project
GCP_PROJECT_ID=your-project-id ./deploy.sh
```

3. Your service will be available at:
   - `https://ai-assistant.agent.daydreams.systems`

### Manual Deployment Steps

If you prefer to deploy manually:

```bash
# Install the Daydreams deploy CLI
pnpm add -g @daydreamsai/deploy

# Deploy the service
daydreams-deploy deploy \
  --name ai-assistant \
  --project your-gcp-project \
  --region us-central1 \
  --file server.ts \
  --env .env.production \
  --memory 512Mi \
  --max-instances 10
```

### Testing Your Deployment

```bash
# Health check (free)
curl https://ai-assistant.agent.daydreams.systems/health

# Service info (free)
curl https://ai-assistant.agent.daydreams.systems/

# AI request with payment (using the client)
bun run client.ts --url https://ai-assistant.agent.daydreams.systems
```

### Monitoring

View logs and metrics:

```bash
# View logs
daydreams-deploy logs ai-assistant --project your-project

# Follow logs in real-time
daydreams-deploy logs ai-assistant --project your-project --follow

# List all deployments
daydreams-deploy list --project your-project
```

### Update or Remove

```bash
# Update deployment (redeploy)
bun run deploy

# Remove deployment
daydreams-deploy delete ai-assistant --project your-project
```

## Production Considerations

- Use environment variables for all sensitive data
- Consider adding rate limiting beyond payments
- Implement proper error handling and logging
- Add monitoring and analytics
- Consider using a database for persistent storage
- Add authentication for user-specific data
- Implement proper CORS handling for web clients
- Set up alerts for service health and usage
- Configure auto-scaling based on traffic patterns
- Use Cloud Secret Manager for sensitive keys
