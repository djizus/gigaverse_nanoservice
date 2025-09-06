# Repository Guidelines

## Project Structure & Module Organization
- api: Bun + Hono nanoservice (domains, shared, infrastructure). Entry: `api/server.ts`, exports via `api/index.ts`.
- front/daydreams-ui: Vite + React demo UI.
- database: SQL schema and `migrations/` used by Supabase.
- old, fun: archived or exploratory references — do not modify for production.

## Build, Test, and Development Commands
- API dev: `bun --cwd api run dev` — start Hono server (default `PORT=4021`).
- API start: `bun --cwd api run start` — production-style start.
- API tests: `bun --cwd api test` — run Bun tests when present.
- Front dev: `bun --cwd front/daydreams-ui run dev` — Vite dev server.
- Front build: `bun --cwd front/daydreams-ui run build` — production build.
- Health check: `curl http://localhost:4021/health` — verify API is running.

## Coding Style & Naming Conventions
- Language: TypeScript (ESM). Indentation: 2 spaces.
- File naming: kebab-case; suffix files by role: `*.controller.ts`, `*.service.ts`, `*.routes.ts`.
- Modules: prefer domain folders under `api/src/domains/*`; shared utilities in `api/src/shared/*`; infra adapters in `api/src/infrastructure/*`.
- Validation: use `zod` schemas for input; reuse shared types from `api/src/shared/types`.

## Testing Guidelines
- Framework: Bun test runner.
- Location: place tests under `api/tests` or co-locate as `*.test.ts`.
- Scope: unit test services and validators; add lightweight route tests for happy-path/validation errors.
- Run: `bun --cwd api test`. Aim to cover critical domain services and auth middleware.

## Commit & Pull Request Guidelines
- Messages: imperative, concise, present tense (e.g., "add dungeon validation", "fix x402 wallet retry"). Optional Conventional Commits with scopes: `api`, `front`, `db`.
- PRs: include purpose, linked issue, test plan (commands/requests), and screenshots for UI changes. Keep PRs small and focused.

## Security & Configuration Tips
- Secrets: never commit `.env`. Start from `api/.env.example`. Key vars: `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `DAYDREAMS_USE_MEMORY`, `FACILITATOR_URL`, `NETWORK`.
- Local first: use `DAYDREAMS_USE_MEMORY=true` to avoid DB when iterating.
- Validation: validate all inputs with `zod`; avoid leaking internal errors in responses.

