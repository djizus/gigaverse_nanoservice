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
          // Emit as default message event for broad client compatibility
          await sse.writeSSE({ data: JSON.stringify(evt) });
        } catch {}
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(async () => {
        try { await sse.writeSSE({ data: JSON.stringify({ type: 'ping', t: Date.now() }) }); } catch {}
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
