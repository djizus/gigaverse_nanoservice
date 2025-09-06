import { Hono } from 'hono';
import { DungeonController } from '../../domains/dungeon/dungeon.controller';
import { DungeonRequestSchema } from '../../domains/dungeon/dungeon.validation';
import { DatabaseService } from '../../infrastructure/database/database.service';

export const createDungeonUiRoutes = (controller: DungeonController, db?: DatabaseService) => {
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

  // List recent runs (optionally filter by status)
  app.get('/ui/dungeon/runs', async (c) => {
    try {
      const statusParam = c.req.query('status');
      const status = statusParam ? statusParam.split(',') as any : undefined;
      const res = await db!.listRuns({ status, limit: 50 });
      if (!res.success) return c.json({ error: res.error }, 500);
      return c.json(res.data);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to list runs' }, 500);
    }
  });

  // Get run summary + details
  app.get('/ui/dungeon/run/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const res = await db!.getDungeonRunComplete(id);
      if (!res.success) return c.json({ error: res.error }, 404);
      return c.json(res.data);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to get run' }, 500);
    }
  });

  return app;
};
