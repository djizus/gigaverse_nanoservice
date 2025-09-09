import React from 'react'
import { Api } from '../api/client'
import type { AgentConfig } from '../api/types'

type GlobalMessage = {
  id: string
  sessionId: string
  agentId?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt: string
}

export default function GlobalChatRoute() {
  const [agents, setAgents] = React.useState<AgentConfig[]>([])
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [messages, setMessages] = React.useState<GlobalMessage[]>([])
  const [streaming, setStreaming] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Persist per-agent session mapping so context is kept across sends
  const [sessionsMap, setSessionsMap] = React.useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('globalChat.sessions') || '{}') } catch { return {} }
  })

  React.useEffect(() => { (async ()=>{ try { setAgents(await Api.listAgents()) } catch(e:any){ setError(e?.message||'Failed') } })() }, [])
  React.useEffect(() => { try { localStorage.setItem('globalChat.sessions', JSON.stringify(sessionsMap)) } catch {} }, [sessionsMap])

  function toggleAgent(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  async function send(message: string) {
    if (selectedIds.length === 0) { setError('Select at least one agent'); return }
    setLoading(true)
    setError(null)
    const now = new Date().toISOString()
    // Append one global user message
    setMessages(prev => [...prev, { id: `local-user-${now}` as any, sessionId: 'global', agentId: undefined as any, role: 'user', content: message, createdAt: now }])

    try {
      if (!streaming) {
        // Non-streaming fan-out
        const results = await Promise.all(selectedIds.map(async (aid) => {
          const res = await Api.sendMessage(aid, { message, sessionId: sessionsMap[aid] })
          return { aid, sessionId: res.sessionId }
        }))
        const nextMap: Record<string,string> = { ...sessionsMap }
        for (const r of results) nextMap[r.aid] = r.sessionId
        setSessionsMap(nextMap)
        // Fetch last assistant messages and append with agent badges
        for (const r of results) {
          try {
            const msgs = await Api.listMessages(r.sessionId)
            const last = msgs.filter(m => m.role === 'assistant').slice(-1)[0]
            if (last) setMessages(prev => [...prev, { id: last.id, sessionId: last.sessionId, role: last.role, content: last.content, createdAt: last.createdAt, agentId: r.aid }])
          } catch {}
        }
      } else {
        // Streaming fan-out
        const placeholders: Record<string, string> = {}
        await Promise.all(selectedIds.map(async (aid) => {
          const startId = `local-asst-${aid}-${now}`
          placeholders[aid] = startId
          // add assistant placeholder per agent
          setMessages(prev => [...prev, { id: startId as any, sessionId: sessionsMap[aid] || 'pending', agentId: aid, role: 'assistant', content: '', createdAt: now }])
          let newSessionId: string | undefined
          await Api.sendMessageStream(aid, { message, sessionId: sessionsMap[aid] }, (ev) => {
            if (ev.type === 'start') {
              newSessionId = ev.sessionId
              setSessionsMap(prev => ({ ...prev, [aid]: newSessionId! }))
            } else if (ev.type === 'delta') {
              setMessages(prev => {
                const out = [...prev]
                const idx = out.findIndex(m => m.id === startId)
                if (idx >= 0) out[idx] = { ...out[idx], content: (out[idx].content || '') + (ev.delta || '') }
                return out
              })
            }
          })
          // Optionally sync full message after stream end
          const sid = newSessionId || sessionsMap[aid]
          if (sid) {
            try {
              const msgs = await Api.listMessages(sid)
              const last = msgs.filter(m => m.role === 'assistant').slice(-1)[0]
              if (last) {
                setMessages(prev => prev.map(m => m.id === startId ? { id: last.id, sessionId: last.sessionId, role: last.role, content: last.content, createdAt: last.createdAt, agentId: aid } : m))
              }
            } catch {}
          }
        }))
      }
    } catch (e:any) {
      setError(e?.message || 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row" style={{ alignItems:'flex-start', gap: 12 }}>
      <div className="card" style={{ width: 320 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Agents</div>
        <div style={{ maxHeight: 340, overflow:'auto' }}>
          {agents.map(a => (
            <label key={a.id} className="row" style={{ alignItems:'center', gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={()=> toggleAgent(a.id)} />
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ color:'#9ca3af', fontSize:12 }}>{a.model} · {a.context}</div>
              </div>
            </label>
          ))}
          {agents.length === 0 && <div style={{ color:'#9ca3af' }}>No agents yet.</div>}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="checkbox" checked={streaming} onChange={(e)=> setStreaming(e.target.checked)} /> Stream
          </label>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%' }}>
          <div className="row" style={{ alignItems:'center' }}>
            <div style={{ fontWeight: 600 }}>Global Chat</div>
            <div style={{ marginLeft:'auto', color:'#9ca3af' }}>
              {selectedIds.length} target{selectedIds.length===1?'':'s'}
            </div>
          </div>
          <div className="messages" style={{ flex:1, minHeight:0 }}>
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="meta">
                  {m.role} · {new Date(m.createdAt).toLocaleTimeString()}
                  {m.agentId && <span className="badge" style={{ marginLeft: 6 }}>{(agents.find(a=>a.id===m.agentId)?.name)||m.agentId.slice(0,6)}</span>}
                </div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {messages.length === 0 && <div style={{ color:'#666' }}>No messages yet. Select agents and send a message.</div>}
          </div>
          <MessageInput onSend={(t)=> send(t)} disabled={loading || selectedIds.length===0} />
          {error && <div style={{ color:'#ef4444', marginTop:8 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

function MessageInput({ onSend, disabled }: { onSend: (m: string) => void; disabled?: boolean }) {
  const [value, setValue] = React.useState('')
  return (
    <form onSubmit={(e)=> { e.preventDefault(); const v=value.trim(); if (!v) return; onSend(v); setValue('') }}>
      <div className="row" style={{ alignItems:'center' }}>
        <input value={value} onChange={(e)=> setValue(e.target.value)} placeholder="Type a message to all selected agents…" disabled={disabled} />
        <button className="btn" type="submit" disabled={disabled}>Send</button>
      </div>
    </form>
  )
}
