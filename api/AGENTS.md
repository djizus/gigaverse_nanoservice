# Repository Guidelines

## Project Structure & Module Organization
- `src/api`: Hono server bootstrap and HTTP routes (e.g., `server.ts`, `routes/*`).
- `src/domains`: Feature logic by domain (e.g., `dungeon.*`, `gigaverse.*`, `payment.*`).
- `src/infrastructure`: External services (e.g., `config/env.config.ts`, `database/*`).
- `src/shared`: Cross-cutting types, utils, middleware.
- `database/schema.sql`: Supabase/Postgres schema for runs, logs, events.
- Entrypoints: `server.ts` (service), `test-dungeon.ts` (local client/examples).

## Build, Test, and Development Commands
- `bun install`: Install dependencies.
- `bun run dev` / `bun run start`: Run the service locally (entry: `server.ts`).
- `bun run client`: Run a basic dungeon request against the local service.
- `bun run client:examples`: Run example client flows (duplicates, etc.).
- `bun run test:deployed`: Health check for a deployed instance.
- `bun run deploy` / `GCP_PROJECT_ID=... ./deploy.sh`: Deploy to Cloud Run.

Set env via `.env` (see `.env.example`, `env.production.example`). Default port is `4021`.

## Coding Style & Naming Conventions
- Language: TypeScript (ES2022/ESNext, strict mode). Use 2‑space indentation and semicolons.
- Naming: `camelCase` for variables/functions, `PascalCase` for classes/types.
- Files: group by domain with pattern `<feature>.<role>.ts` (e.g., `dungeon.service.ts`, `env.config.ts`).
- Imports: prefer path aliases (`@/domains/*`, `@/shared/*`, etc.) defined in `tsconfig.json`.
- Keep modules small and focused; place cross-domain helpers under `src/shared`.

## Testing Guidelines
- Integration: use `bun run client` or `client:examples` and observe Supabase events for the returned `runId`.
- No formal unit test framework is configured. If adding tests, use Bun’s test runner and name files `*.test.ts` under `src/**`.
- Validate DB schema changes with `database/schema.sql` and local Postgres/Supabase.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject; include scope when helpful (e.g., `dungeon:`). Example: `dungeon: fix token reset on death`.
- PRs must include: clear description, rationale, testing steps/commands, affected env vars, and screenshots/logs for route changes.
- Link related issues. Update `README.md`/`AGENTS.md` when behavior or operations change.

## Security & Configuration Tips
- Never commit secrets. Use `.env` and keep keys out of logs. Avoid printing tokens; remove debug lines before production.
- Ensure `ADDRESS` is a valid Ethereum address and Supabase RLS policies fit your environment.
