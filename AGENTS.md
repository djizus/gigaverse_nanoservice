# Repository Guidelines (Updated for Namespaced Services)

## Project Structure & Module Organization
- api: Bun + Hono nanoservice (domains, shared, infrastructure). Entry: `api/server.ts`, exports via `api/index.ts`.
- front/daydreams-ui: Vite + React demo UI.
- database: SQL schema and `migrations/` used by Supabase.
- old, fun: archived or exploratory references — do not modify for production.

## Build, Test, and Development Commands
- API dev: `bun --cwd api run dev` — start Hono server (default `PORT=4021`)
- API start: `bun --cwd api run start` — production-style start
- Front dev: `bun --cwd front/daydreams-ui run dev` — Vite dev server
- Front build: `bun --cwd front/daydreams-ui run build` — production build
- Health check: `curl http://localhost:4021/health`

## Coding Style & Naming Conventions
- TypeScript (ESM), 2 spaces
- File naming: kebab-case, suffix by role: `*.controller.ts`, `*.service.ts`, `*.routes.ts`
- Modules: prefer domain folders under `api/src/domains/*`; shared under `api/src/shared/*`; infra adapters under `api/src/infrastructure/*`
- Validation: use `zod` schemas for input; reuse shared types from `api/src/shared/types`

## Testing Guidelines
- Framework: Bun test runner.
- Location: place tests under `api/tests` or co-locate as `*.test.ts`.
- Scope: unit test services and validators; add lightweight route tests for happy-path/validation errors.
- Run: `bun --cwd api test`. Aim to cover critical domain services and auth middleware.

## Commit & Pull Request Guidelines
- Messages: imperative, concise, present tense (e.g., "add dungeon validation", "fix x402 wallet retry"). Optional Conventional Commits with scopes: `api`, `front`, `db`.
- PRs: include purpose, linked issue, test plan (commands/requests), and screenshots for UI changes. Keep PRs small and focused.

## Security & Configuration Tips
- Never commit `.env`. Start from `api/.env.example`
- Key vars: `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `DAYDREAMS_USE_MEMORY`, `FACILITATOR_URL`, `NETWORK`, `TORII_URL`, `NAMESPACE`
- Use `DAYDREAMS_USE_MEMORY=true` to iterate without DB
- Validate all inputs with `zod`; avoid leaking internal errors

---

# Architecture: Service Registry + Namespaced Routes

We support multiple independent nano‑services behind a generic interface, using a Service Registry and namespaced routes.

- Registry: `api/src/infrastructure/services/service-registry.ts`
  - Registers ServicePlugins keyed by `{developer}:{serviceId}` (developer defaults to `daydreams`)
  - Exposes service manifest (`/services`, `/services/:developer/:service/manifest`)
- Namespaced routes: `api/src/api/routes/ns.routes.ts`
  - `POST /ns/:developer?/:service/call` — single‑op contract `{ op, data }`
  - `GET /ns/:developer?/:service/stream?runId=...` — SSE (optional)
  - Global events: `GET /dungeon/events`

Existing plugins
- Gigaverse: `api/src/services/gigaverse/gigaverse.plugin.ts` wraps `DungeonService`
- Loot Survivor: `api/src/services/loot-survivor/*` ports LS-ENGINE (read‑only)

UI
- The React UI discovers services at `GET /services` and renders a manifest‑driven Launch modal (uiSchema). Tabs: Dashboard, Services, Runs, Agents, Settings.

DB adapters
- Interface: `api/src/infrastructure/database/adapter.interface.ts`
- Memory: `adapters/memory.adapter.ts` (dev)
- Supabase: `adapters/supabase.adapter.ts` (prod)
- `DatabaseService` delegates to the chosen adapter (memory when `DAYDREAMS_USE_MEMORY=true`)

DB schema & migration
- Schema: `database/schema.sql` (includes namespacing fields)
- If upgrading an existing DB: run `database/migrations/20250907_ns_services.sql`
- New columns (with defaults): `service_id TEXT`, `developer TEXT`, `meta JSONB`
- Indexes: `(service_id, created_at)`, `(developer, service_id, status)`

# Service Plugin Contract

ServicePlugin should implement:
- `manifest: ServiceManifest` — `{ developer, serviceId, name, version, summary?, capabilities[], uiSchema? }`
- `init(): Promise<void>` — optional initialization
- `health(): Promise<{ ok: boolean }>` — optional health check
- `call(op: string, data: any): Promise<any>` — single‑op handler

op conventions
- `startRun` — start or queue a new run (immediate response with `runId`)
- `context` — fetch read‑only context (LS)
- Additional ops as needed per service (e.g., `resumeRun`, `cancel`), but prefer small surface area

uiSchema conventions
- `fields: Array<{ id, label, type: 'text'|'textarea'|'number'|'checkbox', required?, min?, max?, default?, placeholder? }>`
- The UI will merge `default` values with user input and validate required/min/max

# API Examples

Start a Gigaverse run
```
POST /ns/daydreams/gigaverse/call
{ "op": "startRun", "data": { "playerAddress":"0x...", "gigaverseToken":"<JWT>", "dungeonId":1, "totalRuns":1, "llmModel":"google-vertex/gemini-2.5-flash", "context":"Be aggressive..." } }
```

Loot Survivor (read‑only)
```
POST /ns/daydreams/loot-survivor/call
{ "op": "context", "data": { "gameId": 123 } }

POST /ns/daydreams/loot-survivor/call
{ "op": "startRun", "data": { "gameId": 123 } }
```

# UI/UX Guidelines

- Services tab is the single place to launch runs (no sidebar)
- Runs tab shows a filter bar (service/status/search) and a Live Runs list + detail
- Agents tab manages agent lifecycle and chat
- Dashboard shows a snapshot of recent runs; use Services to launch

# PR & Changes

- Include updated examples for any new services or ops in README/AGENTS
- Document new env vars, DB changes, and UI fields in the PR
