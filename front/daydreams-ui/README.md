Daydreams UI (Frontend)

Minimal React + Vite UI to manage Daydreams agents and chat with them.

Quick start

- Set the backend CORS origin: in the service `.env`, set `CORS_ORIGIN=http://localhost:5173` and restart the server.
- Install deps and run:

```
cd front/daydreams-ui
bun install
bun run dev
```

- Open http://localhost:5173 and set the API URL if needed (defaults to `http://localhost:4021`).

Minimal test (no login)

- Run API with memory storage: set `DAYDREAMS_USE_MEMORY=true`.
- In the UI, set `VITE_DEV_USER_ID=alice` in `.env.local`.
- Start the UI; all `/daydreams/*` requests will be scoped to `alice` automatically.

Supabase login (prod-like)

- Add to `.env.local`:
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
- After login, the UI injects `Authorization: Bearer <token>` into all `/daydreams/*` requests.

Features

- List available contexts from `/daydreams/contexts`.
- Create, list and delete agents.
- Create/select sessions and send messages to `/daydreams/agents/:id/send`.
- View session message history.
- One-click preset: "Quick: Base Gigaverse Agent" deletes any existing agent named
  "Gigaverse Agent" and recreates it with sensible defaults (model, context,
  description, and instructions).

Config

- `VITE_API_URL` can be set to point to your deployed API.
- The backend must expose CORS for the frontend origin.
 - Optional: `VITE_DEV_USER_ID` for quick dev without login.
 - Optional: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for login.
