import type { AgentConfig, Message, RunEvent, RunSummary, ServiceManifest, Session } from './types'
let BASE_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4021'
let AUTH_TOKEN: string | undefined
let DEV_USER_ID: string | undefined
export function setBaseUrl(url: string) { if (url) BASE_URL = url }
export function getBaseUrl() { return BASE_URL }
export function setAuthToken(t?: string) { AUTH_TOKEN = t || undefined }
export function setDevUserId(u?: string) { DEV_USER_ID = u || undefined }
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = DEV_USER_ID ? `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(DEV_USER_ID)}` : `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(()=>'')
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json() as Promise<T>
}
export const Api = {
  // Services
  listServices(): Promise<ServiceManifest[]> { return http('/services') },
  callService(serviceId: string, developer: string|undefined, op: string, data: any): Promise<any> {
    const dev = developer || 'daydreams';
    return http(`/ns/${encodeURIComponent(dev)}/${encodeURIComponent(serviceId)}/call`, { method:'POST', body: JSON.stringify({ op, data }) })
  },
  // Runs
  listRuns(): Promise<RunSummary[]> { return http('/ui/dungeon/runs') },
  getRun(id: string): Promise<{ summary: RunSummary, details: RunEvent[] }> { return http(`/ui/dungeon/run/${id}`) },
  getRunCompanion(id: string): Promise<{ agentId?: string|null, sessionId?: string|null }> { return http(`/ui/run/${id}/companion`) },
  setRunCompanion(id: string, payload: { agentId?: string; name?: string; routerApiKey?: string }): Promise<{ agentId: string; sessionId: string }> {
    return http(`/ui/run/${id}/companion`, { method:'POST', body: JSON.stringify(payload) })
  },
  // Agents
  listAgents(): Promise<AgentConfig[]> { return http('/daydreams/agents') },
  getAgent(id: string): Promise<AgentConfig> { return http(`/daydreams/agents/${id}`) },
  listSessions(agentId: string): Promise<Session[]> { return http(`/daydreams/agents/${agentId}/sessions`) },
  listMessages(sessionId: string): Promise<Message[]> { return http(`/daydreams/sessions/${sessionId}/messages`) },
  sendMessage(agentId: string, payload: { message: string; sessionId?: string }): Promise<{ sessionId: string; user: Message; reply: Message; }> {
    return http(`/daydreams/agents/${agentId}/send`, { method:'POST', body: JSON.stringify(payload) })
  }
  ,
  createAgent(input: { name: string; model: string; context: string; description?: string; instructions?: string }): Promise<AgentConfig> {
    return http('/daydreams/agents', { method:'POST', body: JSON.stringify(input) })
  }
  ,
  deleteAgent(id: string): Promise<{ success: boolean }> {
    return http(`/daydreams/agents/${id}`, { method:'DELETE' })
  }
  ,
  async sendMessageStream(
    agentId: string,
    payload: { message: string; sessionId?: string },
    onEvent: (ev: { type: 'start' | 'delta' | 'done' | 'error'; sessionId?: string; delta?: string; error?: string }) => void
  ): Promise<void> {
    const base = `${BASE_URL}/daydreams/agents/${agentId}/send/stream`
    const url = DEV_USER_ID ? `${base}?userId=${encodeURIComponent(DEV_USER_ID)}` : base
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok || !res.body) {
      const text = await res.text().catch(()=> '')
      throw new Error(`${res.status} ${res.statusText}: ${text}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const lines = block.split('\n')
        let eventType
        let dataLine
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim()
          if (line.startsWith('data:')) dataLine = line.slice(5).trim()
        }
        if (dataLine) {
          try {
            const data = JSON.parse(dataLine)
            if (eventType === 'start') onEvent({ type: 'start', sessionId: data.sessionId })
            else if (eventType === 'done') onEvent({ type: 'done' })
            else if (eventType === 'error') onEvent({ type: 'error', error: data?.message || 'Stream error' })
            else onEvent({ type: 'delta', delta: data.delta || '' })
          } catch {}
        }
      }
    }
  }
}
export function openEventSource(path: string, onEvent: (data: any) => void): () => void {
  const url = DEV_USER_ID ? `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(DEV_USER_ID)}` : `${BASE_URL}${path}`
  const es = new EventSource(url)
  es.onmessage = (e) => { try { const d = JSON.parse(e.data); onEvent(d) } catch {} }
  return () => { try { es.close() } catch {} }
}