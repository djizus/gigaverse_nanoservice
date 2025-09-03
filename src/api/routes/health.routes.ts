import { Hono } from "hono";

export const createHealthRoutes = () => {
  const app = new Hono();

  // Health check (free)
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      service: "Game Activities Nano Service",
      timestamp: new Date().toISOString(),
    });
  });

  // Usage info (free)
  app.get("/", (c) => {
    return c.json({
      service: "Game Activities Nano Service",
      endpoints: {
        "/health": "Health check (free)",
        "/dungeon": "Dungeon runner endpoint (POST, $0.01 per run)",
        "/fishing": "Fishing endpoint (POST, $0.01 per run)",
      },
      usage: {
        dungeon: {
          method: "POST",
          endpoint: "/dungeon",
          body: {
            jwt: "your-jwt-token",
            runs: 1,
            dungeonType: "classic|nightmare|inferno|abyss",
            sessionId: "optional-session-id",
          },
        },
        fishing: {
          method: "POST",
          endpoint: "/fishing",
          body: {
            runs: 1,
            fishingType: "small|normal|big",
            sessionId: "optional-session-id",
          },
        },
      },
      pricing: {
        dungeon: "$0.01 per run (e.g., 20 runs = $0.20)",
        fishing: "$0.01 per run (e.g., 5 runs = $0.05)",
      },
      examples: {
        "1 run": "$0.01",
        "10 runs": "$0.10", 
        "20 runs": "$0.20",
        "50 runs": "$0.50"
      },
    });
  });

  return app;
};