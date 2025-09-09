import React from 'react'
import { Api } from '../api/client'
import type { ServiceManifest, AgentConfig, Session, Message } from '../api/types'
import { RunChat } from '../features/runs/components/RunChat'
import { useSearch } from '@tanstack/react-router'

export default function ServiceWorkspaceRoute() {
  const search = useSearch({ from: '/services/workspace' as any }) as { developer?: string; service?: string }
  const developer = search?.developer || 'daydreams'
  const serviceId = search?.service || ''
  const [svc, setSvc] = React.useState<ServiceManifest | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)

  // Chat state
  const [selectedAgent, setSelectedAgent] = React.useState<AgentConfig | null>(null)
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [streaming, setStreaming] = React.useState(true)

  React.useEffect(() => { const t = setTimeout(()=> setToast(null), 2000); return () => clearTimeout(t) }, [toast])

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const list = await Api.listServices()
        const found = list.find(s => s.developer === developer && s.serviceId === serviceId) || null
        setSvc(found)
        const fields = (found?.uiSchema?.fields || []) as any[]
        const init: Record<string, any> = {}
        for (const f of fields) init[f.id] = f.default ?? (f.type==='checkbox' ? false : '')
        setForm(init)
      } catch (e:any) {
        setError(e?.message || 'Failed to load service')
      } finally { setLoading(false) }
    })()
  }, [developer, serviceId])

  const SessionSelector = (
    <div className="row">
      <select value={selectedSession?.id || ''} onChange={async (e) => {
        const id = e.target.value
        const sess = sessions.find(s => s.id === id) || null
        setSelectedSession(sess)
        if (sess) {
          const msgs = await Api.listMessages(sess.id).catch(()=>[])
          setMessages(msgs)
        }
      }}>
        <option value="">New Session</option>
        {sessions.map(s => (
          <option key={s.id} value={s.id}>{s.title || s.id.slice(0, 8)} · {new Date(s.createdAt).toLocaleString()}</option>
        ))}
      </select>
      <button className="btn" onClick={() => setSelectedSession(null)}>Reset</button>
    </div>
  )

  async function onLaunch() {
    if (!svc) return
    try {
      setLoading(true); setError(null)
      // Merge defaults with user input
      const fields = (svc.uiSchema?.fields || []) as any[]
      const data: Record<string, any> = {}
      for (const f of fields) {
        let v = form[f.id]
        if (v === undefined || v === '') v = f.default
        if (f.type === 'checkbox') v = !!v
        if (f.type === 'number') {
          const raw = String(v ?? '')
          v = raw.trim() === '' ? NaN : parseInt(raw, 10)
        }
        data[f.id] = v
      }
      // simple validation
      for (const f of fields) {
        const v = data[f.id]
        if (f.required && (v === undefined || v === null || v === '' || (f.type==='number' && (typeof v !== 'number' || Number.isNaN(v))))) throw new Error(`Missing required field: ${f.label || f.id}`)
        if (f.type==='number' && typeof v === 'number') {
          if (typeof f.min === 'number' && v < f.min) throw new Error(`${f.label||f.id} must be >= ${f.min}`)
          if (typeof f.max === 'number' && v > f.max) throw new Error(`${f.label||f.id} must be <= ${f.max}`)
        }
      }
      const res = await Api.callService(svc.serviceId, developer, 'startRun', data)
      if ((res as any)?.runId) {
        try { localStorage.setItem('lastRunId', (res as any).runId) } catch {}
        window.location.hash = '#/runs2'
        setToast(`Run started: ${(res as any).runId.slice(0,8)}…`)
      }
    } catch (e:any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  async function onUseCompanion() {
    const rid = localStorage.getItem('lastRunId') || ''
    if (!rid) { setToast('Start a run first'); return }
    try {
      setLoading(true)
      const res = await Api.setRunCompanion(rid, { name: `${serviceId} Companion` })
      const agent = await Api.getAgent(res.agentId)
      setSelectedAgent(agent)
      const sess = await Api.listSessions(agent.id)
      setSessions(sess)
      const current = sess.find(s => s.id === res.sessionId) || sess[0] || null
      setSelectedSession(current)
      if (current) setMessages(await Api.listMessages(current.id))
      setToast('Companion attached')
    } finally { setLoading(false) }
  }

  async function onSend(message: string) {
    if (!selectedAgent) return
    setLoading(true)
    try {
      const res = await Api.sendMessage(selectedAgent.id, { message, sessionId: selectedSession?.id })
      const msgs = await Api.listMessages(res.sessionId)
      setMessages(msgs)
      if (!selectedSession || res.sessionId !== selectedSession.id) {
        const sess = await Api.listSessions(selectedAgent.id)
        setSessions(sess)
        setSelectedSession(sess.find(s => s.id === res.sessionId) || sess[0] || null)
      }
    } finally { setLoading(false) }
  }

  if (!svc) return <div className="card">Loading workspace…{error && <div style={{ color:'#ef4444' }}>{error}</div>}</div>

  const fields = (svc.uiSchema?.fields || []) as any[]

  return (
    <div className="row" style={{ alignItems:'flex-start', gap: 12 }}>
      <div className="card" style={{ flex: 1 }}>
        <div className="row" style={{ alignItems:'center' }}>
          <div style={{ fontWeight: 700 }}>{svc.serviceId}</div>
          <div style={{ color:'#9ca3af' }}>{svc.version}</div>
          <div style={{ marginLeft: 'auto' }} className="row">
            <button className="btn" onClick={onLaunch}>Launch</button>
          </div>
        </div>
        {svc.summary && <div style={{ color:'#9ca3af', marginBottom:8 }}>{svc.summary}</div>}
        <div>
          {fields.map((f:any) => {
            const val = form[f.id] ?? (f.default ?? (f.type==='checkbox' ? false : ''))
            if (f.type === 'checkbox') return (
              <label key={f.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" checked={!!val} onChange={(e)=> setForm(prev=>({ ...prev, [f.id]: e.target.checked }))} />
                {f.label}
              </label>
            )
            if (f.type === 'select') {
              const opts: string[] = Array.isArray(f.options) ? f.options : (Array.isArray(f.enum) ? f.enum : [])
              return (
                <div key={f.id} style={{ marginBottom: 8 }}>
                  <label>{f.label}</label>
                  <select value={String(val ?? '')} onChange={(e)=> setForm(prev=>({ ...prev, [f.id]: e.target.value }))}>
                    {!val && <option value="">-- select --</option>}
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )
            }
            if (f.type === 'textarea') {
              return (
                <div key={f.id} style={{ marginBottom: 8 }}>
                  <label>{f.label}</label>
                  <textarea style={{ minHeight: 100 }} placeholder={f.placeholder || ''} value={val} onChange={(e)=> setForm(prev=>({ ...prev, [f.id]: e.target.value }))} />
                </div>
              )
            }
            return (
              <div key={f.id} style={{ marginBottom: 8 }}>
                <label>{f.label}</label>
                <input
                  type={f.type==='number' ? 'text' : 'text'}
                  inputMode={f.type==='number' ? 'numeric' : undefined}
                  placeholder={f.placeholder || ''}
                  value={String(val ?? '')}
                  onChange={(e)=> setForm(prev=>({ ...prev, [f.id]: e.target.value }))}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ width: 460 }}>
        <RunChat
          selectedAgent={selectedAgent}
          sessions={sessions}
          selectedSession={selectedSession}
          messages={messages}
          streaming={streaming}
          SessionSelector={SessionSelector}
          onUseCompanion={onUseCompanion}
          onSend={onSend}
          onToggleStreaming={setStreaming}
        />
      </div>
    </div>
  )
}
