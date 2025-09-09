import React from 'react'
import { Api } from '../api/client'
import type { AgentConfig, Message, Session } from '../api/types'

export default function AgentsRoute() {
  const knownModels = [
    'google-vertex/gemini-2.5-flash',
    'openai/gpt-4-turbo',
    'anthropic/claude-sonnet-4-20250514',
  ]
  const [agents, setAgents] = React.useState<AgentConfig[]>([])
  const [selected, setSelected] = React.useState<AgentConfig | null>(null)
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [streaming, setStreaming] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => { (async ()=>{ try { setAgents(await Api.listAgents()) } catch(e:any){ setError(e?.message||'Failed') } })() }, [])

  React.useEffect(() => { (async ()=>{
    if (!selected) { setSessions([]); setSelectedSession(null); setMessages([]); return }
    try { const sess = await Api.listSessions(selected.id); setSessions(sess); setSelectedSession(sess[0]||null); if (sess[0]) setMessages(await Api.listMessages(sess[0].id)) } catch(e:any){ setError(e?.message||'Failed') }
  })() }, [selected?.id])

  const SessionSelector = (
    <div className="row">
      <select value={selectedSession?.id || ''} onChange={async (e)=>{ const id=e.target.value; const s=sessions.find(x=>x.id===id)||null; setSelectedSession(s); if (s) setMessages(await Api.listMessages(s.id)) }}>
        <option value="">New Session</option>
        {sessions.map(s => (<option key={s.id} value={s.id}>{s.title || s.id.slice(0,8)} · {new Date(s.createdAt).toLocaleString()}</option>))}
      </select>
      <button className="btn" onClick={()=> setSelectedSession(null)}>Reset</button>
    </div>
  )

  async function createAgent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name')||'Agent')
    const model = String(fd.get('model')||knownModels[0])
    const context = String(fd.get('context')||'chat')
    const description = String(fd.get('description')||'')
    const instructions = String(fd.get('instructions')||'You are a helpful assistant.')
    try {
      setLoading(true)
      const created = await Api.createAgent({ name, model, context, description, instructions });
      setAgents(a => [created, ...a]);
      setSelected(created)
      e.currentTarget.reset()
    } catch (e:any) {
      setError(e?.message||'Create failed')
    } finally { setLoading(false) }
  }

  async function send(message: string) {
    if (!selected) return
    setLoading(true)
    try {
      if (!streaming) {
        const res = await Api.sendMessage(selected.id, { message, sessionId: selectedSession?.id })
        const msgs = await Api.listMessages(res.sessionId)
        setMessages(msgs)
        if (!selectedSession || res.sessionId !== selectedSession.id) {
          const sess = await Api.listSessions(selected.id)
          setSessions(sess)
          setSelectedSession(sess.find(s => s.id === res.sessionId) || sess[0] || null)
        }
      } else {
        const now = new Date().toISOString()
        const tempUser = { id:`local-user-${now}`, sessionId: selectedSession?.id||'pending', agentId: selected.id, role: 'user' as const, content: message, createdAt: now }
        const tempAssistant = { id:`local-asst-${now}`, sessionId: selectedSession?.id||'pending', agentId: selected.id, role: 'assistant' as const, content: '', createdAt: now }
        setMessages(prev => [...prev, tempUser as any, tempAssistant as any])
        let newSessionId: string | undefined
        await Api.sendMessageStream(selected.id, { message, sessionId: selectedSession?.id }, (ev) => {
          if (ev.type === 'start') {
            newSessionId = ev.sessionId
            if (!selectedSession) {
              Api.listSessions(selected.id).then(sess => { setSessions(sess); setSelectedSession(sess.find(s => s.id === newSessionId) || sess[0] || null) })
            }
          } else if (ev.type === 'delta') {
            setMessages(prev => { const out=[...prev]; const last=out[out.length-1]; if (last && (last as any).role==='assistant') (last as any).content += ev.delta||''; return out })
          }
        })
        const sid = newSessionId || selectedSession?.id
        if (sid) setMessages(await Api.listMessages(sid))
      }
    } catch (e:any) { setError(e?.message||'Send failed') } finally { setLoading(false) }
  }

  return (
    <div className="row" style={{ alignItems:'flex-start', gap: 12 }}>
      <div className="card" style={{ width: 360 }}>
        <form onSubmit={createAgent}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Create Agent</div>
          <div style={{ marginBottom: 6 }}>
            <label>Name</label>
            <input name="name" defaultValue="Agent" />
          </div>
          <div className="row" style={{ marginBottom: 6 }}>
            <div>
              <label>Model</label>
              <select name="model" defaultValue={knownModels[0]}>{knownModels.map(m=> <option key={m} value={m}>{m}</option>)}</select>
            </div>
            <div>
              <label>Context</label>
              <input name="context" defaultValue="chat" />
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label>Description</label>
            <input name="description" placeholder="(optional)" />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label>Instructions</label>
            <textarea name="instructions" placeholder="(optional)" style={{ minHeight: 100 }} defaultValue="You are a helpful assistant." />
          </div>
          <button className="btn" type="submit">Create</button>
        </form>
        <div style={{ height: 8 }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Agents</div>
        <div style={{ maxHeight: 280, overflow:'auto' }}>
          {agents.map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 8, cursor:'pointer', borderColor: selected?.id===a.id ? '#93c5fd' : undefined }} onClick={()=> setSelected(a)}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ color:'#9ca3af', fontSize:12 }}>{a.model} · {a.context}</div>
            </div>
          ))}
          {agents.length===0 && <div style={{ color:'#9ca3af' }}>No agents yet.</div>}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%' }}>
          <div className="row" style={{ alignItems:'center' }}>
            <div style={{ fontWeight: 600 }}>Agent Chat</div>
            <div style={{ marginLeft:'auto' }} className="row">
              <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input type="checkbox" checked={streaming} onChange={(e)=> setStreaming(e.target.checked)} /> Stream
              </label>
            </div>
          </div>
          {!selected && <div style={{ color:'#9ca3af' }}>Select an agent to chat.</div>}
          {selected && (
            <>
              <div className="row" style={{ alignItems:'center' }}>
                <div style={{ fontWeight: 600 }}>{selected.name}</div>
                <div style={{ color:'#9ca3af' }}>{selected.model} · {selected.context}</div>
                <div style={{ marginLeft:'auto' }}>{SessionSelector}</div>
              </div>
              <div className="messages" style={{ flex:1, minHeight:0 }}>
                {messages.map(m => (
                  <div key={m.id} className={`msg ${m.role}`}>
                    <div className="meta">{m.role} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                    <div className="bubble">{m.content}</div>
                  </div>
                ))}
                {messages.length === 0 && <div style={{ color:'#666' }}>No messages yet.</div>}
              </div>
              <MessageInput onSend={(t)=> send(t)} disabled={!selected} />
            </>
          )}
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
        <input value={value} onChange={(e)=> setValue(e.target.value)} placeholder="Type a message…" disabled={disabled} />
        <button className="btn" type="submit" disabled={disabled}>Send</button>
      </div>
    </form>
  )
}
