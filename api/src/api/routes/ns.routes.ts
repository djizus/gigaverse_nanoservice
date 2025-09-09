import { Hono } from 'hono';
import { ServiceRegistry } from '../../infrastructure/services/service-registry';
import { subscribe } from '../../infrastructure/events/event-bus';

export function createNamespacedServiceRoutes(registry: ServiceRegistry) {
  const app = new Hono();

  // POST /ns/:developer?/:service/call  with body { op, data }
  app.post('/ns/:developer?/:service/call', async (c) => {
    try {
      const developer = c.req.param('developer') || 'daydreams';
      const service = c.req.param('service');
      const plugin = registry.get(developer, service);
      if (!plugin) return c.json({ error: 'Service not found' }, 404);
      const body = await c.req.json().catch(() => ({}));
      const op = body?.op;
      const data = body?.data ?? {};
      if (!op || typeof op !== 'string') return c.json({ error: 'Missing op' }, 400);
      const res = await plugin.call(op, data, { requestId: c.get('requestId'), userId: c.get('userId') });
      return c.json(res);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Service call failed' }, 500);
    }
  });

  // GET /ns/:developer?/:service/stream?runId=...
  app.get('/ns/:developer?/:service/stream', async (c) => {
    const runId = c.req.query('runId');
    const encoder = new TextEncoder();
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    const stream = new ReadableStream({
      start(controller) {
        const write = (event: any) => {
          if (runId && event.runId !== runId) return; // filter if runId provided
          const type = event.type || 'message';
          const payload = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${type}\n`));
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };
        const unsub = subscribe(write);
        // initial ping
        controller.enqueue(encoder.encode(`event: start\n`));
        controller.enqueue(encoder.encode(`data: {"ok":true}\n\n`));
        // close handler
        (c as any).res?.on('close', () => {
          unsub();
          controller.close();
        });
      }
    });
    return new Response(stream);
  });

  return app;
}

