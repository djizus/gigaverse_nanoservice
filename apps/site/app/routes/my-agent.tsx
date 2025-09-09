import React from 'react'
import { Api } from '../api/client'
import type { AgentConfig, Message } from '../api/types'

export default function MyAgentRoute() {
  const [agent, setAgent] = React.useState<AgentConfig | null>(null)
  const [targets, setTargets] = React.useState<AgentConfig[]>([])
  const [selectedTargets, setSelectedTargets] = React.useState<string[]>([])
  const [sessionId, setSessionId] = React.useState<string | undefined>()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => { (async ()=>{
    try {
      const me = await Api.getUserAgent()
      setAgent(me)
      const all = await Api.listAgents()
      setTargets(all.filter(a => a.id !== me.id))
    } catch (e:any) { setError(e?.message||'Failed to init') }
  })() }, [])

  async function send(message: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await Api.sendUserAgentMessage({ message, sessionId, targets: selectedTargets.length ? selectedTargets : undefined })
      setSessionId(res.sessionId)
      // fetch thread to display
      const msgs = await Api.listMessages(res.sessionId)
      setMessages(msgs)
    } catch (e:any) { setError(e?.message||'Send failed') } finally { setLoading(false) }
  }

  function toggleTarget(id: string) {
    setSelectedTargets(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  return (
    <div className="row" style={{ alignItems:'flex-start', gap: 12 }}>
      <div className="card" style={{ width: 320 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>My Agent</div>
        <div style={{ color:'#9ca3af', fontSize: 12, marginBottom: 12 }}>
          {(agent?.name)||'…'} · {(agent?.model)||''} · {(agent?.context)||''}
        </div>
        <div style={{ fontWeight:600, marginBottom: 6 }}>Targets</div>
        <div style={{ maxHeight: 320, overflow:'auto' }}>
          {targets.map(a => (
            <label key={a.id} className="row" style={{ alignItems:'center', gap:8, marginBottom:6 }}>
              <input type="checkbox" checked={selectedTargets.includes(a.id)} onChange={()=> toggleTarget(a.id)} />
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ color:'#9ca3af', fontSize:12 }}>{a.model} · {a.context}</div>
              </div>
            </label>
          ))}
          {targets.length===0 && <div style={{ color:'#9ca3af' }}>No other agents.</div>}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%' }}>
          <div className="row" style={{ alignItems:'center' }}>
            <div style={{ fontWeight: 600 }}>Chat with My Agent</div>
          </div>
          <div className="messages" style={{ flex:1, minHeight:0 }}>
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="meta">{m.role} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {messages.length === 0 && <div style={{ color:'#666' }}>No messages yet. Ask something and I will consult other agents.</div>}
          </div>
          <MessageInput disabled={loading || !agent} onSend={send} />
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
        <input value={value} onChange={(e)=> setValue(e.target.value)} placeholder="Ask your agent…" disabled={disabled} />
        <button className="btn" type="submit" disabled={disabled}>Send</button>
      </div>
    </form>
  )
}

