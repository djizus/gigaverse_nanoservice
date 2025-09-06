import { Hono } from 'hono';
import { DungeonController } from '../../domains/dungeon/dungeon.controller';
import { DungeonRequestSchema } from '../../domains/dungeon/dungeon.validation';

export const createDungeonUiRoutes = (controller: DungeonController) => {
  const app = new Hono();

  // Development/UI helper: start a dungeon run without x402 payment (for internal UI only)
  app.post('/ui/dungeon/start', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = DungeonRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: 'Invalid request', details: parsed.error.errors }, 400);
      }
      // Attach parsed body to context to reuse controller without middleware
      c.set('parsedBody', parsed.data);
      c.set('runs', parsed.data.totalRuns);
      c.set('skipPayment', true);
      return controller.executeDungeon(c);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to start run' }, 500);
    }
  });

  return app;
};

