import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { subscribe } from '../../infrastructure/events/event-bus';

export const createDungeonEventsRoutes = () => {
  const app = new Hono();

  // Global SSE stream for all dungeon events
  app.get('/dungeon/events', async (c) => {
    return streamSSE(c, async (sse) => {
      const unsubscribe = subscribe(async (evt) => {
        try {
          // Emit using event.type for better client routing
          await sse.writeSSE({ event: String(evt?.type || 'event'), data: JSON.stringify(evt) });
        } catch {}
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(async () => {
        try { await sse.writeSSE({ event: 'ping', data: JSON.stringify({ t: Date.now() }) }); } catch {}
      }, 15000);

      // Cleanup on close
      try {
        await new Promise<void>((resolve) => (sse.onAbort(() => resolve())));
      } finally {
        clearInterval(heartbeat);
        unsubscribe();
      }
    });
  });

  return app;
};

