import React from 'react'
import { Api, setBaseUrl, getBaseUrl, setDevUserId } from '../api/client'
import type { AgentConfig, Message, Session } from '../api/types'
import { RunChat } from '../features/runs/components/RunChat'

export default function Runs2Route() {
  const [apiUrl, setApiUrl] = React.useState<string>(() => getBaseUrl())
  const [liveRuns, setLiveRuns] = React.useState<string[]>([])
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)
  const [filterService, setFilterService] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [runServices, setRunServices] = React.useState<Record<string,string>>({})
  const [runsMeta, setRunsMeta] = React.useState<Record<string, { status?: string; created_at?: string; service_id?: string }>>({})
  const [events, setEvents] = React.useState<Record<string, any[]>>({})
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  // Chat state
  const [selectedAgent, setSelectedAgent] = React.useState<AgentConfig | null>(null)
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [streaming, setStreaming] = React.useState(true)

  React.useEffect(() => { setBaseUrl(apiUrl) }, [apiUrl])
  React.useEffect(() => { const t = setTimeout(()=> setToast(null), 2000); return () => clearTimeout(t) }, [toast])

  // Load initial runs
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const runs = await Api.listRuns()
        const ids = runs.map(r => r.id).filter(Boolean)
        setLiveRuns(ids)
        const meta: Record<string, any> = {}
        const svcMap: Record<string, string> = {}
        for (const r of runs) { meta[r.id] = { status: (r as any).status, created_at: (r as any).created_at, service_id: (r as any).service_id }; if ((r as any).service_id) svcMap[r.id] = (r as any).service_id }
        setRunsMeta(meta); setRunServices(svcMap)
        if (!selectedRunId) { const last = localStorage.getItem('lastRunId') || ''; if (last) setSelectedRunId(last) }
      } finally { setLoading(false) }
    })()
  }, [])

  // Autoload mapping (run -> agent/session)
  React.useEffect(() => {
    (async () => {
      if (!selectedRunId) return
      try {
        const map = await Api.getRunCompanion(selectedRunId)
        if (map?.agentId) {
          const a = await Api.getAgent(map.agentId)
          setSelectedAgent(a)
          const sess = await Api.listSessions(a.id)
          setSessions(sess)
          const current = (map.sessionId && sess.find(s => s.id === map.sessionId)) || sess[0] || null
          setSelectedSession(current)
          if (current) {
            const msgs = await Api.listMessages(current.id)
            setMessages(msgs)
          }
        }
      } catch { setToast('Agent not found or not owned by you'); setSelectedAgent(null); setSessions([]); setSelectedSession(null); setMessages([]) }
    })()
  }, [selectedRunId])

  // Global SSE for events
  React.useEffect(() => {
    const close = Api ? (() => {
      const cleanup = (cb: () => void) => cb
      return cleanup(() => {})
    })() : () => {}
    try {
      const unsub = new EventSource(`${getBaseUrl()}/dungeon/events`)
      unsub.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data)
          if (!evt?.runId) return
          setEvents(prev => ({ ...prev, [evt.runId]: [ ...(prev[evt.runId]||[]), evt ] }))
          setLiveRuns(prev => (prev.includes(evt.runId) ? prev : [evt.runId, ...prev]))
          const t = String(evt.type || evt.event_type || '').toLowerCase()
          setRunsMeta(prev => {
            const cur = prev[evt.runId] || {}
            let status = cur.status || 'started'
            if (t === 'all_runs_completed' || t === 'run_completed') status = 'completed'
            else if (t === 'error') status = 'failed'
            else if (!cur.status || cur.status === 'started') status = 'processing'
            return { ...prev, [evt.runId]: { ...cur, status } }
          })
        } catch { setToast('Agent not found or not owned by you'); setSelectedAgent(null); setSessions([]); setSelectedSession(null); setMessages([]) }
      }
      return () => { try { unsub.close() } catch {} }
    } catch { return close }
  }, [apiUrl])

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

  async function createCompanion() {
    if (!selectedRunId) return
    try {
      setLoading(true)
      const svcId = runServices[selectedRunId]
      if (!svcId) return
      const res = await Api.setRunCompanion(selectedRunId, { name: `${svcId} Companion` })
      const agent = await Api.getAgent(res.agentId)
      setSelectedAgent(agent)
      const sess = await Api.listSessions(agent.id)
      setSessions(sess)
      const current = sess.find(s => s.id === res.sessionId) || sess[0] || null
      setSelectedSession(current)
      if (current) {
        const msgs = await Api.listMessages(current.id)
        setMessages(msgs)
      }
      setToast('Companion attached')
    } finally { setLoading(false) }
  }

  async function handleSendMessage(message: string) {
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

  return (
    <div className="row" style={{ alignItems:'stretch', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar: runs + events */}
      <div style={{ width: 320, borderRight: '1px solid var(--border)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div className="row" style={{ alignItems:'center', padding: 8, gap: 8, borderBottom: '1px solid var(--border)' }}>
          <strong>Runs</strong>
          <button className="btn" onClick={async ()=>{
            const runs = await Api.listRuns()
            const ids = runs.map(r => r.id).filter(Boolean)
            setLiveRuns(ids)
            const meta: Record<string, any> = {}; const svcMap: Record<string, string> = {}
            for (const r of runs) { meta[r.id] = { status: (r as any).status, created_at: (r as any).created_at, service_id: (r as any).service_id }; if ((r as any).service_id) svcMap[r.id] = (r as any).service_id }
            setRunsMeta(meta); setRunServices(svcMap)
        if (!selectedRunId) { const last = localStorage.getItem('lastRunId') || ''; if (last) setSelectedRunId(last) }
          }} style={{ marginLeft:'auto' }}>Refresh</button>
        </div>
        <div style={{ padding: 8 }}>
          <div className="row" style={{ gap: 6, marginBottom: 8, alignItems:'center' }}>
            <select value={filterService} onChange={(e)=> setFilterService(e.target.value)}>
              <option value="">All services</option>
              {Array.from(new Set(Object.values(runServices))).map(svc => (<option key={svc} value={svc}>{svc}</option>))}
            </select>
            <select value={filterStatus} onChange={(e)=> setFilterStatus(e.target.value)}>
              <option value="">All status</option>
              <option value="started">started</option>
              <option value="processing">processing</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="aborted">aborted</option>
            </select>
            <input placeholder="Search by ID" value={search} onChange={(e)=> setSearch(e.target.value)} />
          </div>
          <div className="card" style={{ maxHeight: 180, overflow:'auto', marginBottom: 8 }}>
            {liveRuns.filter(rid => {
              if (filterService && runServices[rid] !== filterService) return false
              if (filterStatus && (runsMeta[rid]?.status !== filterStatus)) return false
              if (search && !rid.includes(search)) return false
              return true
            }).map(rid => (
              <div key={rid} className="row" style={{ alignItems:'center', gap:6, padding:'6px 4px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: selectedRunId===rid ? '#0f141b' : undefined }} onClick={()=> setSelectedRunId(rid)}>
                <div style={{ fontWeight:600, fontSize: 12 }}>{rid.slice(0,8)}…</div>
                {runServices[rid] && (<span className="badge">{runServices[rid]}</span>)}
                {runsMeta[rid]?.status && (<span className="badge">{runsMeta[rid]?.status}</span>)}
              </div>
            ))}
            {liveRuns.length === 0 && <div style={{ color:'#666' }}>No runs.</div>}
          </div>
          <div className="card" style={{ maxHeight: 'calc(100vh - 220px)', overflow:'auto' }}>
            {!selectedRunId && <div style={{ color:'#666' }}>Select a run to view events.</div>}
            {selectedRunId && (
              <div>
                {(events[selectedRunId] || []).map((e,i) => {
                  const ts = new Date(e.timestamp || Date.now()).toLocaleTimeString()
                  let summary = e.message || ''
                  return (
                    <div key={i} className="row" style={{ alignItems:'center', gap:8, padding:'6px 4px', borderBottom:'1px solid var(--border)' }}>
                      <span className="badge" style={{ opacity:0.8 }}>{e.type || e.event_type}</span>
                      <span style={{ fontSize:12, color:'#666' }}>{ts}</span>
                      <div style={{ fontSize:12, color:'#e5e7eb' }}>{summary}</div>
                    </div>
                  )
                })}
                {(events[selectedRunId] || []).length === 0 && (
                  <div style={{ color:'#666' }}>No events yet for this run.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main: chat */}
      <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div className="row" style={{ alignItems:'center', padding: 8, gap: 8, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600 }}>Run 2</div>
          {selectedRunId && (<><span style={{ color:'#9ca3af' }}>{selectedRunId}</span>{runServices[selectedRunId] && (<span className="badge">{runServices[selectedRunId]}</span>)}{runsMeta[selectedRunId]?.status && (<span className="badge">{runsMeta[selectedRunId]?.status}</span>)}</>)}
          <div style={{ marginLeft:'auto' }} className="row">
            {selectedRunId && (<button className="btn" onClick={()=>{ try { navigator.clipboard?.writeText(selectedRunId); setToast('Copied'); } catch {} }}>Copy ID</button>)}
          </div>
        </div>
        <div style={{ padding: 12, flex: 1, overflow:'auto' }}>
          {!selectedRunId && <div style={{ color:'#666' }}>Select a run to view chat.</div>}
          {selectedRunId && (
            <RunChat
              selectedAgent={selectedAgent}
              sessions={sessions}
              selectedSession={selectedSession}
              messages={messages}
              streaming={streaming}
              SessionSelector={SessionSelector}
              onUseCompanion={createCompanion}
              onSend={handleSendMessage}
              onToggleStreaming={setStreaming}
            />
          )}
        </div>
      </div>
    </div>
  )
}
