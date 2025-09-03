# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Service
- `bun run dev` - Start the development server on port 4021
- `bun run start` - Start the production server on port 4021

### Testing & Client Commands  
- `bun run client` - Run the client with example requests
- `bun run client:examples` - Run client with payment examples

### Deployment
- `bun run deploy` - Deploy to Google Cloud Run (staging: daydreams-labs-staging)
- `GCP_PROJECT_ID=your-project ./deploy.sh` - Deploy to custom GCP project
- `bun run test:deployed` - Test health endpoint of deployed service

## Architecture Overview

This is a **real-time dungeon nanoservice** that provides paid Gigaverse dungeon runs with real-time event logging using x402 micropayments on Base Sepolia and Supabase for real-time database updates.

### Core Components

**Domain Layer** (`src/domains/`)
- `dungeon/` - Real-time dungeon game mechanics and controller  
- `gigaverse/` - Gigaverse client integration and heuristic decision-making
- `payment/` - Payment service and pricing logic

**Infrastructure Layer** (`src/infrastructure/`)
- `database/` - Supabase client and real-time event logging
- `config/` - Environment configuration with Zod validation

**API Layer** (`src/api/`)
- `server.ts` - Main server initialization with Hono
- `routes/game.routes.ts` - Game endpoints with payment middleware
- `routes/health.routes.ts` - Health check endpoints (free)

**Shared Layer** (`src/shared/`)
- `middleware/pricing.middleware.ts` - Dynamic pricing based on runs
- `middleware/payment.middleware.ts` - x402 payment enforcement
- `utils/error.utils.ts` - Consistent error handling utilities
- `types/` - Shared TypeScript types

### Real-time Architecture Flow
```
Client Request → Pricing Middleware → x402 Payment → Dungeon Controller → Background Processing
                     ↓                      ↓                ↓                       ↓
                Calculate Price    Process USDC Payment  Return runId      Heuristic Game Execution
                ($0.01 per run)    (Base Sepolia Network)      ↓                       ↓
                                                        Client Subscribes → Real-time Database Events
                                                        (Supabase Realtime)    (Combat, Loot, Progress)
```

### Key Endpoints
- `POST /dungeon` - Start real-time dungeon runs ($0.01 per run, returns immediately with runId)
- `GET /health` - Health check (free)
- `GET /` - Service info (free)

### Real-time Database Schema
- `dungeon_runs` - Main run sessions with status tracking
- `run_logs` - Individual run details within a session  
- `run_events` - Real-time events (combat moves, loot selection, room progression)

## Environment Configuration

Required environment variables (`.env` for dev, `.env.production` for deployment):
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
```

## Heuristic Decision System

### Context-Driven Gameplay
The service uses intelligent heuristics for automated dungeon gameplay:
- **Combat Strategy**: Context-aware rock/paper/scissors decisions based on enemy patterns
- **Loot Selection**: Prioritizes upgrades based on player context (aggressive, defensive, balanced)
- **Room Navigation**: Automatic progression through dungeon rooms
- **Real-time Logging**: Every action logged to database with timestamps

### Decision Logic
The system analyzes:
- **Player Context**: User-provided strategy instructions  
- **Enemy Patterns**: Historical win/loss data for optimal moves
- **Loot Optimization**: Equipment and upgrade prioritization
- **Risk Management**: Health/shield monitoring for survival

## Request/Response Flow

### Dungeon Request Example
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

### Dungeon Response Example (Immediate)
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

### Real-time Event Stream
Clients subscribe to `run_events` table for live updates:
```javascript
const { event_type, message, event_data } = payload.new;
// Events: run_started, combat_move, loot_selected, room_cleared, run_completed
```

### Dynamic Pricing
- Base price: $0.01 per run
- Maximum payment: $20.00 per request
- Maximum runs: 2000 per request
- Price calculation validated before payment

## TypeScript Path Aliases
The project uses these path aliases (configured in `tsconfig.json`):
- `@/*` → `src/*`
- `@/domains/*` → `src/domains/*`
- `@/shared/*` → `src/shared/*`
- `@/infrastructure/*` → `src/infrastructure/*`
- `@/api/*` → `src/api/*`

## Deployment Process

The `deploy.sh` script handles Cloud Run deployment:
1. Validates `.env.production` exists with required keys
2. Prepares deployment package with `prepare-deploy.js`
3. Deploys using `@daydreamsai/deploy` CLI
4. Configures domain: `ai-assistant.agent.daydreams.systems`

Deployment settings:
- Memory: 512Mi
- Max instances: 10
- Min instances: 0  
- Port: 4021
- Timeout: 30 seconds

## Development Notes

### Adding New Game Activities
1. Create new domain in `src/domains/[activity]/`
2. Implement controller, service, types, and validation
3. Add routes in `src/api/routes/game.routes.ts`
4. Configure pricing in middleware
5. Register agent in `agent.registry.ts` if AI-powered

### Error Handling Pattern
- Controllers validate requests using Zod schemas
- Services handle business logic and external APIs
- Middleware handles payment and pricing errors
- All errors logged with descriptive messages

### Session Management
- Sessions identified by optional `sessionId` parameter
- Agent memory persists within session
- Each session tracks its own game state and progress