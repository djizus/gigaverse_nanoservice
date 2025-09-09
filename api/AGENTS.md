# API Agents & Services (Namespaced)

## Project Structure & Module Organization
- `src/api`: Hono server bootstrap and HTTP routes (e.g., `server.ts`, `routes/*`).
- `src/domains`: Feature logic by domain (e.g., `dungeon.*`, `gigaverse.*`, `payment.*`).
- `src/infrastructure`: External services (e.g., `config/env.config.ts`, `database/*`).
- `src/shared`: Cross-cutting types, utils, middleware.
- `database/schema.sql`: Supabase/Postgres schema for runs, logs, events.
- Entrypoints: `server.ts` (service), `test-dungeon.ts` (local client/examples).

## Build & Run
- `bun install` — install dependencies
- `bun run dev` / `bun run start` — run the API (entry: `src/api/server.ts`)
- UI: `bun --cwd ../front/daydreams-ui run dev` (tabs: Dashboard, Services, Runs, Agents, Settings)

Set env via `.env` (see `.env.example`, `env.production.example`). Default port is `4021`.

## Coding Style
- TypeScript (ESNext/strict), 2 spaces; `@/` path aliases enabled in `tsconfig.json`
- Group by domain: `<feature>.<role>.ts` (e.g., `dungeon.service.ts`)

## Testing
- Manual: use `curl`/UI to hit namespaced routes; observe events via `/dungeon/events`
- Validate DB schema via `database/schema.sql` (or migration) against Supabase/Postgres

## Commit & Pull Request Guidelines
- Commits: short, imperative subject; include scope when helpful (e.g., `dungeon:`). Example: `dungeon: fix token reset on death`.
- PRs must include: clear description, rationale, testing steps/commands, affected env vars, and screenshots/logs for route changes.
- Link related issues. Update `README.md`/`AGENTS.md` when behavior or operations change.

## Security & Configuration
- `.env` only (see `api/.env.example`)
- Keys: `SUPABASE_URL`, `SUPABASE_KEY`, `DAYDREAMS_USE_MEMORY`, `TORII_URL`, `NAMESPACE`, `FACILITATOR_URL`, `ADDRESS`, `NETWORK`

---

## Service Registry & Namespaced Routes
- Registry: `src/infrastructure/services/service-registry.ts` (register plugins, list manifests)
- Routes: `src/api/routes/ns.routes.ts`
  - `POST /ns/:developer?/:service/call` (single op `{ op, data }`)
  - `GET /ns/:developer?/:service/stream?runId=...`
  - `GET /services`, `GET /services/:developer/:service/manifest`

### Plugins
- Gigaverse: `src/services/gigaverse/gigaverse.plugin.ts` → wraps `DungeonService`
- Loot Survivor: `src/services/loot-survivor/*` → LS‑ENGINE context + read‑only runner

### DB Adapters
- Interface: `src/infrastructure/database/adapter.interface.ts`
- Memory (dev): `src/infrastructure/database/adapters/memory.adapter.ts`
- Supabase (prod): `src/infrastructure/database/adapters/supabase.adapter.ts`
- `DatabaseService` auto‑selects adapter using `DAYDREAMS_USE_MEMORY`

### Database schema/migration
- Use `database/schema.sql` on fresh DBs
- For existing DBs, run `database/migrations/20250907_ns_services.sql`
- New columns (defaulted): `service_id`, `developer`, `meta`

---

## API Examples

Start a Gigaverse Dungeon run
```
POST /ns/daydreams/gigaverse-dungeon/call
{ "op": "startRun", "data": { "playerAddress":"0x...", "gigaverseToken":"<JWT>", "dungeonId":1, "totalRuns":1, "llmModel":"google-vertex/gemini-2.5-flash", "user_instructions":"Be aggressive..." } }
```

Start a Gigaverse Fishing run
```
POST /ns/daydreams/gigaverse-fishing/call
{ "op": "startRun", "data": { "playerAddress":"0x...", "gigaverseToken":"<JWT>", "runType":"normal", "totalRuns":1, "llmModel":"google-vertex/gemini-2.5-flash", "user_instructions":"Turn 1: play wide coverage..." } }
```

Start a Vega Trading signal run
```
POST /ns/daydreams/vega-trading/call
{ "op": "startRun", "data": { "symbol":"BTC-USD", "source":"gmx", "llmModel":"google-vertex/gemini-2.5-flash", "user_instructions":"Only signal when high confidence." } }
```

Loot Survivor context
```
POST /ns/daydreams/loot-survivor/call
{ "op": "context", "data": { "gameId": 123 } }
```

Loot Survivor start (read‑only)
```
POST /ns/daydreams/loot-survivor/call
{ "op": "startRun", "data": { "gameId": 123 } }
```
