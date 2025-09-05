import type { AgentConfig, CreateAgentInput, Message, Session } from './types';

let BASE_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4021';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}/daydreams/agents/${agentId}/send/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
};

export function getBaseUrl() {
  return BASE_URL as string;
}

export function setBaseUrl(url: string) {
  BASE_URL = url || BASE_URL;
}
