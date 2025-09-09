import type { AgentConfig, CreateAgentInput, Message, Session } from './types';

let BASE_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4021';
let AUTH_TOKEN: string | undefined;
let DEV_USER_ID: string | undefined;

export function setAuthToken(token?: string) {
  AUTH_TOKEN = token || undefined;
}

export function setDevUserId(uid?: string) {
  DEV_USER_ID = uid || undefined;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = DEV_USER_ID
    ? `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(DEV_USER_ID)}`
    : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const Api = {
  async listServices(): Promise<any[]> {
    return http('/services');
  },
  async callService(serviceId: string, developer: string | undefined, op: string, data: any): Promise<any> {
    const dev = developer || 'daydreams';
    return http(`/ns/${encodeURIComponent(dev)}/${encodeURIComponent(serviceId)}/call`, { method: 'POST', body: JSON.stringify({ op, data }) });
  },
  async listContexts(): Promise<string[]> {
    const data = await http<any[]>('/daydreams/contexts');
    // API returns objects: { id, name, description }
    return (Array.isArray(data) ? data : []).map((x: any) => (typeof x === 'string' ? x : x?.id)).filter(Boolean);
  },
  listAgents(): Promise<AgentConfig[]> {
    return http('/daydreams/agents');
  },
  createAgent(input: CreateAgentInput): Promise<AgentConfig> {
    return http('/daydreams/agents', { method: 'POST', body: JSON.stringify(input) });
  },
  deleteAgent(id: string): Promise<{ success: boolean }> {
    return http(`/daydreams/agents/${id}`, { method: 'DELETE' });
  },
  getAgent(id: string): Promise<AgentConfig> {
    return http(`/daydreams/agents/${id}`);
  },
  listSessions(agentId: string): Promise<Session[]> {
    return http(`/daydreams/agents/${agentId}/sessions`);
  },
  listMessages(sessionId: string): Promise<Message[]> {
    return http(`/daydreams/sessions/${sessionId}/messages`);
  },
  sendMessage(agentId: string, payload: { message: string; sessionId?: string }): Promise<{ sessionId: string; user: Message; reply: Message; }>{
    return http(`/daydreams/agents/${agentId}/send`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async sendMessageStream(
    agentId: string,
    payload: { message: string; sessionId?: string },
    onEvent: (ev: { type: 'start' | 'delta' | 'done'; sessionId?: string; delta?: string }) => void
  ): Promise<void> {
    const base = `${BASE_URL}/daydreams/agents/${agentId}/send/stream`;
    const url = DEV_USER_ID ? `${base}?userId=${encodeURIComponent(DEV_USER_ID)}` : base;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const lines = block.split('\n');
        let eventType: 'start' | 'delta' | 'done' | undefined;
        let dataLine: string | undefined;
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim() as any;
          if (line.startsWith('data:')) dataLine = line.slice(5).trim();
        }
        if (dataLine) {
          try {
            const data = JSON.parse(dataLine);
            if (eventType === 'start') onEvent({ type: 'start', sessionId: data.sessionId });
            else if (eventType === 'done') onEvent({ type: 'done' });
            else onEvent({ type: 'delta', delta: data.delta || '' });
          } catch {}
        }
      }
    }
  }
  ,
  // Back-compat wrapper: starts Gigaverse run via namespaced /ns call
  startDungeon(payload: {
    context: string;
    playerAddress: string;
    gigaverseToken: string;
    totalRuns: number;
    dungeonId: number;
    isJuiced?: boolean;
    consumables?: any[];
    gearInstanceIds?: string[];
    llmModel?: string;
  }): Promise<{ runId: string; status: string; message: string; }> {
    return http(`/ns/daydreams/gigaverse-dungeon/call`, { method: 'POST', body: JSON.stringify({ op: 'startRun', data: payload }) });
  }
  ,
  // Loot Survivor read-only operations
  startLSRun(payload: { gameId: number; llmModel?: string; }): Promise<{ runId: string; status: string; message: string; }> {
    return http(`/ns/daydreams/loot-survivor/call`, { method: 'POST', body: JSON.stringify({ op: 'startRun', data: payload }) });
  }
  ,
  getLSContext(gameId: number): Promise<{ content: string; tokens: number; }> {
    return http(`/ns/daydreams/loot-survivor/call`, { method: 'POST', body: JSON.stringify({ op: 'context', data: { gameId } }) });
  }
  ,
  listRuns(status?: string[]): Promise<any[]> {
    const qs = status && status.length ? `?status=${encodeURIComponent(status.join(','))}` : '';
    return http(`/ui/dungeon/runs${qs}`);
  }
  ,
  getRun(id: string): Promise<{ summary: any; details: any[] }> {
    return http(`/ui/dungeon/run/${id}`);
  }

  ,
  // Run ↔ Companion mapping
  getRunCompanion(id: string): Promise<{ agentId?: string|null; sessionId?: string|null }> {
    return http(`/ui/run/${id}/companion`);
  }
  ,
  setRunCompanion(id: string, payload: { agentId?: string; name?: string; routerApiKey?: string }): Promise<{ agentId: string; sessionId: string }> {
    return http(`/ui/run/${id}/companion`, { method: 'POST', body: JSON.stringify(payload) });
  }
};

export function getBaseUrl() {
  return BASE_URL as string;
}

export function setBaseUrl(url: string) {
  BASE_URL = url || BASE_URL;
}
