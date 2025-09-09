import { Api } from '../api';

export type GlobalAgentEvent =
  | { type: 'navigate'; page: 'dashboard'|'services'|'runs'|'agents'|'settings' }
  | { type: 'open-service'; serviceId: string }
  | { type: 'agent-message'; agentId: string; message: string }
  | { type: 'service-call'; serviceId: string; developer?: string; op: string; data: any }
  | { type: 'error'; message: string };

export interface GlobalAgentContext {
  navigate: (page: 'dashboard'|'services'|'runs'|'agents'|'settings') => void;
  openServiceLauncher: (service: any, initialForm?: Record<string, any>) => void;
  focusAgentChat: (agentId: string) => void;
}

export interface HandleResult {
  events: GlobalAgentEvent[];
  summary: string;
}

// A lightweight, rule-based global agent for quick UX wins.
// It parses simple slash commands and natural-ish phrases to control the UI
// and call agents/services. This intentionally avoids LLM dependency in the UI.
export class GlobalAgent {
  private ctx: GlobalAgentContext;
  constructor(ctx: GlobalAgentContext) {
    this.ctx = ctx;
  }

  async suggest(input: string): Promise<string[]> {
    const q = input.trim().toLowerCase();
    const out: string[] = [];
    if (!q) return [
      'go services',
      'go runs',
      'go agents',
      '/service <id> startRun {...}',
      '/ask <agent-name> <message>'
    ];
    if ('services'.startsWith(q) || q.startsWith('go s')) out.push('go services');
    if ('runs'.startsWith(q) || q.startsWith('go r')) out.push('go runs');
    if ('agents'.startsWith(q) || q.startsWith('go a')) out.push('go agents');
    if ('settings'.startsWith(q) || q.startsWith('go set')) out.push('go settings');
    if (q.startsWith('/service')) out.push('/service <id> <op> {json}');
    if (q.startsWith('/ask')) out.push('/ask <agent-name> <message>');

    try {
      const services = await Api.listServices();
      for (const s of (services||[])) {
        const key = `${s.developer || 'daydreams'}/${s.serviceId}`.toLowerCase();
        if (key.includes(q)) out.push(`/service ${s.serviceId} startRun {...}`);
      }
    } catch {}
    return Array.from(new Set(out)).slice(0, 8);
  }

  async handle(input: string): Promise<HandleResult> {
    const text = input.trim();
    if (!text) return { events: [], summary: 'empty' };

    // Quick navigations
    const navMap: Record<string, any> = {
      'go services': () => this.ctx.navigate('services'),
      'open services': () => this.ctx.navigate('services'),
      'go runs': () => this.ctx.navigate('runs'),
      'open runs': () => this.ctx.navigate('runs'),
      'go agents': () => this.ctx.navigate('agents'),
      'open agents': () => this.ctx.navigate('agents'),
      'go settings': () => this.ctx.navigate('settings'),
      'open settings': () => this.ctx.navigate('settings'),
      'go dashboard': () => this.ctx.navigate('dashboard'),
      'open dashboard': () => this.ctx.navigate('dashboard'),
    };
    if (navMap[text.toLowerCase()]) {
      navMap[text.toLowerCase()]();
      return { events: [{ type: 'navigate', page: text.toLowerCase().split(' ')[1] } as any], summary: `navigated to ${text}` };
    }

    // Slash commands
    if (text.toLowerCase().startsWith('/service')) {
      // /service <id> <op> {json}
      const m = text.match(/^\/service\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/i);
      if (!m) {
        return { events: [{ type: 'error', message: 'Usage: /service <id> <op> {json}' }], summary: 'invalid service command' };
      }
      const [, serviceId, op, raw] = m;
      let data: any = {};
      try { data = JSON.parse(raw); } catch { return { events: [{ type: 'error', message: 'Invalid JSON payload' }], summary: 'invalid json' }; }
      const developer = (data && data.developer) || undefined;
      const res = await Api.callService(serviceId, developer, op, data);
      return { events: [{ type: 'service-call', serviceId, developer, op, data }], summary: `service ${serviceId} ${op}: ${JSON.stringify(res)}` };
    }

    if (text.toLowerCase().startsWith('/ask')) {
      // /ask <agent-name> <message>
      const m = text.match(/^\/ask\s+([^\s]+)\s+([\s\S]+)$/i);
      if (!m) return { events: [{ type: 'error', message: 'Usage: /ask <agent-name> <message>' }], summary: 'invalid ask command' };
      const [, agentName, message] = m;
      const agents = await Api.listAgents().catch(() => [] as any[]);
      const target = (agents || []).find((a: any) => (a.name||'').toLowerCase() === agentName.toLowerCase());
      if (!target) return { events: [{ type: 'error', message: `Agent not found: ${agentName}` }], summary: 'agent not found' };
      this.ctx.navigate('agents');
      this.ctx.focusAgentChat(target.id);
      return { events: [{ type: 'agent-message', agentId: target.id, message }], summary: `focused agent ${agentName}` };
    }

    // Natural-ish quick intents
    const startDungeon = text.match(/start\s+(gigaverse\s*)?dungeon.*?player\s*:\s*([^\s,;]+).*?token\s*:\s*([^\s,;]+).*?(dungeon|id)\s*:\s*(\d+)/i);
    if (startDungeon) {
      const playerAddress = startDungeon[2];
      const gigaverseToken = startDungeon[3];
      const dungeonId = Number(startDungeon[5]);
      const data = { playerAddress, gigaverseToken, dungeonId, totalRuns: 1 };
      const res = await Api.callService('gigaverse-dungeon', 'daydreams', 'startRun', data);
      return { events: [{ type: 'service-call', serviceId: 'gigaverse-dungeon', developer: 'daydreams', op: 'startRun', data }], summary: `run started: ${JSON.stringify(res)}` };
    }

    // If we reach here, just propose help
    return { events: [{ type: 'error', message: 'Unknown command. Try: go services | /service <id> <op> {json} | /ask <agent> <message>' }], summary: 'unknown' };
  }
}

