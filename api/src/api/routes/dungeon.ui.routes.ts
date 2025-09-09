import { Hono } from 'hono';
import { DungeonController } from '../../domains/dungeon/dungeon.controller';
import { DungeonRequestSchema } from '../../domains/dungeon/dungeon.validation';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AgentService } from '../../daydreams/services/agent.service';

export const createDungeonUiRoutes = (controller: DungeonController, db?: DatabaseService, agents?: AgentService) => {
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


  // Run ↔ Companion mapping (agent/session linked to a run)
  app.get('/ui/run/:id/companion', async (c) => {
    try {
      const id = c.req.param('id');
      const res = await db!.getDungeonRun(id);
      if (!res.success) return c.json({ error: res.error }, 404);
      const meta = (res.data?.meta || {}) as any;
      return c.json({ agentId: meta.agentId || null, sessionId: meta.sessionId || null });
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to get companion' }, 500);
    }
  });

  app.post('/ui/run/:id/companion', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json().catch(() => ({}));
      const { agentId, name, routerApiKey } = body || {};
      const userId = (c.get('userId') as string | undefined) || c.req.query('userId') || undefined;
      let agent: any = null;
      if (agentId) {
        agent = await agents!.getAgent(agentId, userId);
        if (!agent) return c.json({ error: 'Agent not found' }, 404);
      } else {
        const agName = name || 'Run Companion';
        agent = await agents!.createAgent({
          name: agName,
          model: 'google-vertex/gemini-2.5-flash',
          context: 'chat',
          description: 'Run companion agent',
          instructions: 'You are a companion agent linked to a run. Be concise and contextual.',
          routerApiKey,
        }, { userId });
      }
      const session = await agents!.ensureSession(agent.id, undefined, userId);
      await db!.setRunMeta(id, { agentId: agent.id, sessionId: session.id });
      return c.json({ agentId: agent.id, sessionId: session.id });
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to attach companion' }, 500);
    }
  });

  return app;
};
