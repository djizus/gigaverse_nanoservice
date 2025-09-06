# Gigaverse Nanoservice

Lightweight Bun + Hono nanoservice powering Gigaverse agents and dungeon processing, with optional Supabase persistence and a small React demo UI.

## Quick Start

1) Install prerequisites
- Bun 1.x: https://bun.sh
- Optional: `curl` for health checks

2) Setup environment
- Copy `api/.env.example` to `api/.env` and adjust values (e.g., `PORT=4021`, `DAYDREAMS_USE_MEMORY=true` for local, Supabase keys for persistence).

3) Install and run the API
- `bun --cwd api install`
- `bun --cwd api run dev`
- Health: `curl http://localhost:4021/health`

4) Run the demo UI (optional)
- `bun --cwd front/daydreams-ui install`
- `bun --cwd front/daydreams-ui run dev`

## Repo Map
- `api/`: nanoservice (domains, shared, infrastructure). Entry: `server.ts`.
- `front/daydreams-ui/`: Vite + React demo front-end.
- `database/`: schema and migrations (Supabase-friendly).
- `old/`, `fun/`: archived and exploratory references.

## Documentation
- Contributor guide: see `AGENTS.md` for structure, commands, style, and PR process.
- Daydreams PoC details and example requests: `api/README.daydreams.md`.

## License & Contributions
- Contributions welcome via PR. Follow `AGENTS.md` for conventions.
