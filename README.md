# Gigaverse Nanoservice (Namespaced Services)

Lightweight Bun + Hono nanoservice with a generic service framework. It can run multiple, independent nano‑services behind a single API, powered by a Service Registry and namespaced routes. Includes:

- Gigaverse dungeon runner (real‑time, agent‑driven)
- Loot Survivor (read‑only) context/runner using Torii (LS‑ENGINE port)
- Optional Supabase persistence and a React demo UI (tabs: Dashboard, Services, Runs, Agents, Settings)

## Quick Start

1) Install prerequisites
- Bun 1.x: https://bun.sh
- Optional: `curl` for health checks

2) Setup environment
- Copy `api/.env.example` → `api/.env` and adjust values
  - Common: `PORT=4021`, set `DAYDREAMS_USE_MEMORY=true` for local (no DB)
  - Supabase: `SUPABASE_URL`, `SUPABASE_KEY`
  - Loot Survivor: `TORII_URL` (e.g. Cartridge Torii), `NAMESPACE` (e.g. `ls_0_0_6`)

3) Install and run the API
- `bun --cwd api install`
- `bun --cwd api run dev`
- Health: `curl http://localhost:4021/health`

4) Run the demo UI (optional)
- `bun --cwd front/daydreams-ui install`
- `bun --cwd front/daydreams-ui run dev`

5) Database (Supabase) — initial setup or upgrade
- Fresh: run `database/schema.sql` in Supabase SQL editor
- Existing: run `database/migrations/20250907_ns_services.sql` to add namespacing columns (`service_id`, `developer`, `meta`) and indexes

## Repo Map
- `api/`: nanoservice (domains, shared, infrastructure). Entry: `server.ts`.
- `front/daydreams-ui/`: Vite + React demo front-end.
- `database/`: schema and migrations (Supabase-friendly).
- `old/`, `fun/`: archived and exploratory references.

Service plugins live under `api/src/services/<serviceId>/*`:
- `services/gigaverse/gigaverse.plugin.ts` wraps the existing Gigaverse dungeon service
- `services/loot-survivor/*` embeds a stripped LS-ENGINE for Torii context and a read‑only runner

## Documentation
- Contributor guide: see `AGENTS.md` (architecture, commands, style, PR process)
- Daydreams PoC details and example requests: `api/README.daydreams.md`

## Namespaced Services API

All service operations go through the Service Registry using namespaced routes:

- List services: `GET /services`
- Service manifest: `GET /services/:developer/:service/manifest`
- Call operation: `POST /ns/:developer?/:service/call` (developer defaults to `daydreams`)
  - Body: `{ op: string, data: object }`
- SSE stream (optional): `GET /ns/:developer?/:service/stream?runId=...`
- Global SSE (all services): `GET /dungeon/events`

Examples:

Start a Gigaverse Dungeon run
```
curl -X POST localhost:4021/ns/daydreams/gigaverse-dungeon/call \
  -H 'Content-Type: application/json' \
  -d '{
    "op":"startRun",
    "data":{
      "playerAddress":"0x...",
      "gigaverseToken":"<JWT>",
      "dungeonId":1,
      "totalRuns":1,
      "llmModel":"google-vertex/gemini-2.5-flash",
      "context":"Be aggressive in combat. Prioritize upgrade or heal under 50%."
    }
  }'
```

Start a Gigaverse Fishing run
```
curl -X POST localhost:4021/ns/daydreams/gigaverse-fishing/call \
  -H 'Content-Type: application/json' \
  -d '{
    "op":"startRun",
    "data":{
      "playerAddress":"0x...",
      "gigaverseToken":"<JWT>",
      "runType":"normal",
      "totalRuns":1,
      "llmModel":"google-vertex/gemini-2.5-flash"
    }
  }'
```

Fetch Loot Survivor context (read‑only)
```
curl -X POST localhost:4021/ns/daydreams/loot-survivor/call \
  -H 'Content-Type: application/json' \
  -d '{ "op":"context", "data": { "gameId": 123 } }'
```

Start a Loot Survivor run (read‑only)
```
curl -X POST localhost:4021/ns/daydreams/loot-survivor/call \
  -H 'Content-Type: application/json' \
  -d '{ "op":"startRun", "data": { "gameId": 123 } }'
```

## UI Overview
- Tabs: Dashboard (snapshot), Services (discover + Launch), Runs (filters + detail), Agents (create/chat), Settings
- The Services modal is manifest‑driven (uiSchema). Profiles can be saved locally per service.
- Live events stream to the UI via `/dungeon/events` and display in Live Runs and Run Detail.

## License & Contributions
- Contributions welcome via PR. Follow `AGENTS.md` for conventions.
