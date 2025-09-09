import React from 'react'
import { Api, getBaseUrl } from '../api/client'
import type { AgentConfig, Message, Session } from '../api/types'
import { RunChat } from '../features/runs/components/RunChat'
import { Link } from '@tanstack/react-router'

export default function RunsRoute() {
  const [liveRuns, setLiveRuns] = React.useState<string[]>([])
  const [runServices, setRunServices] = React.useState<Record<string, string>>({})
  const [runsMeta, setRunsMeta] = React.useState<Record<string, { status?: string; created_at?: string; service_id?: string }>>({})
  const [events, setEvents] = React.useState<Record<string, any[]>>({})
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = React.useState<AgentConfig | null>(null)
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [streaming, setStreaming] = React.useState(true)
  const [filterService, setFilterService] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
  const [runsCollapsed, setRunsCollapsed] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const runs = await Api.listRuns()
        const ids = runs.map((r:any) => r.id).filter(Boolean)
        setLiveRuns(ids)
        const meta: Record<string, any> = {}
        const svcMap: Record<string, string> = {}
        for (const r of runs) {
          meta[r.id] = { status: (r as any).status, created_at: (r as any).created_at, service_id: (r as any).service_id }
          if ((r as any).service_id) svcMap[r.id] = (r as any).service_id
          if (Array.isArray((r as any).details) && (r as any).details.length) {
            setEvents(prev => ({ ...prev, [r.id]: (r as any).details.map((d:any) => ({ type: d.event_type || d.type, timestamp: d.timestamp, ...d })) }))
          }
        }
        setRunsMeta(meta); setRunServices(svcMap)
      } finally { setLoading(false) }
    })()
  }, [])

  React.useEffect(() => {
    try {
      const es = new EventSource(`${getBaseUrl()}/dungeon/events`)
      es.onmessage = (e) => {
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
      return () => { try { es.close() } catch {} }
    } catch { return }
  }, [])

  function summarize(e: any): string {
    const t = e.type || e.event_type
    if (t === 'room_entered') {
      const stage = e.stage || e.state?.stage
      const roomInStage = e.roomInStage || e.state?.roomInStage
      return `Entered stage ${stage}-${roomInStage}`
    }
    if (t === 'combat_move') return `Move: ${e.move}`
    if (t === 'battle_result') return `Result: ${e.result}`
    if (t === 'loot_phase') return `Loot phase (${Array.isArray(e.lootOptions)?e.lootOptions.length:0})`
    if (t === 'loot_selected') return `Loot: ${e.lootChoice || ''}`
    if (t === 'run_completed') return e.status === 'completed' ? 'Run completed' : `Run ended: ${e.status}`
    if (t === 'all_runs_completed') return `All runs completed ${e.completedRuns}/${e.totalRuns}`
    if (t === 'agent_decision_move') return 'Agent decided: move'
    if (t === 'agent_decision_loot') return 'Agent decided: loot'
    if (t === 'error' || t === 'agent_error') return e.message || 'Error'
    return String(t)
  }

  // Auto-link mapping for selected run (agent/session)
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
          if (current) setMessages(await Api.listMessages(current.id))
        } else {
          setSelectedAgent(null); setSessions([]); setSelectedSession(null); setMessages([])
        }
      } catch { setToast('Agent not found or not owned by you'); setSelectedAgent(null); setSessions([]); setSelectedSession(null); setMessages([]) }
    })()
  }, [selectedRunId])

  const SessionSelector = (
    <div className="row">
      <select value={selectedSession?.id || ''} onChange={async (e)=>{ const id=e.target.value; const s=sessions.find(x=>x.id===id)||null; setSelectedSession(s); if (s) setMessages(await Api.listMessages(s.id)) }}>
        <option value="">New Session</option>
        {sessions.map(s => (<option key={s.id} value={s.id}>{s.title || s.id.slice(0,8)} · {new Date(s.createdAt).toLocaleString()}</option>))}
      </select>
      <button className="btn" onClick={()=> setSelectedSession(null)}>Reset</button>
    </div>
  )

  async function attachCompanion() {
    if (!selectedRunId) return
    const svcId = runServices[selectedRunId]
    if (!svcId) return
    try {
      setLoading(true)
      const res = await Api.setRunCompanion(selectedRunId, { name: `${svcId} Companion` })
      const agent = await Api.getAgent(res.agentId)
      setSelectedAgent(agent)
      const sess = await Api.listSessions(agent.id)
      setSessions(sess)
      const current = sess.find(s => s.id === res.sessionId) || sess[0] || null
      setSelectedSession(current)
      if (current) setMessages(await Api.listMessages(current.id))
    } finally { setLoading(false) }
  }

  async function send(message: string) {
    if (!selectedAgent) return
    setLoading(true)
    try {
      if (!streaming) {
        const res = await Api.sendMessage(selectedAgent.id, { message, sessionId: selectedSession?.id })
        const msgs = await Api.listMessages(res.sessionId)
        setMessages(msgs)
        if (!selectedSession || res.sessionId !== selectedSession.id) {
          const sess = await Api.listSessions(selectedAgent.id)
          setSessions(sess)
          setSelectedSession(sess.find(s => s.id === res.sessionId) || sess[0] || null)
        }
      } else {
        const now = new Date().toISOString()
        const tempUser: any = { id:`local-user-${now}`, sessionId: selectedSession?.id||'pending', agentId: selectedAgent.id, role:'user', content: message, createdAt: now }
        const tempAsst: any = { id:`local-asst-${now}`, sessionId: selectedSession?.id||'pending', agentId: selectedAgent.id, role:'assistant', content:'', createdAt: now }
        setMessages(prev => [...prev, tempUser, tempAsst])
        let newSessionId: string | undefined
        await Api.sendMessageStream(selectedAgent.id, { message, sessionId: selectedSession?.id }, (ev) => {
          if (ev.type === 'start') {
            newSessionId = ev.sessionId
            if (!selectedSession) {
              Api.listSessions(selectedAgent.id).then(sess => { setSessions(sess); setSelectedSession(sess.find(s => s.id === newSessionId) || sess[0] || null) })
            }
          } else if (ev.type === 'delta') {
            setMessages(prev => { const out=[...prev]; const last: any=out[out.length-1]; if (last && last.role==='assistant') last.content += ev.delta||''; return out })
          }
        })
        const sid = newSessionId || selectedSession?.id
        if (sid) setMessages(await Api.listMessages(sid))
      }
    } finally { setLoading(false) }
  }


  return (
    <div className="row" style={{ alignItems:'stretch', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar: live runs */}
      <div style={{ width: runsCollapsed ? 0 : 320, transition:'width 0.2s ease', borderRight:'1px solid var(--border)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div className="row" style={{ alignItems:'center', padding: 8, gap: 8, borderBottom:'1px solid var(--border)' }}>
          <strong>Runs</strong>
          <button className="btn" onClick={()=> setRunsCollapsed(true)} style={{ marginLeft:'auto' }}>{runsCollapsed ? '»' : '«'}</button>
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
            <button className="btn" onClick={async ()=>{ setLoading(true); try { const runs = await Api.listRuns(); const ids = runs.map((r:any)=>r.id).filter(Boolean); setLiveRuns(ids); const meta: any = {}; const svcMap: any = {}; for (const r of runs) { meta[r.id] = { status:(r as any).status, created_at:(r as any).created_at, service_id:(r as any).service_id }; if ((r as any).service_id) svcMap[r.id]=(r as any).service_id } setRunsMeta(meta); setRunServices(svcMap) } finally { setLoading(false) } }}>{loading?'Loading…':'Refresh'}</button>
          </div>
          {toast && (<div className="badge" style={{ background:'#dcfce7', borderColor:'#bbf7d0', color:'#166534', marginBottom:8 }}>{toast}</div>)}
          <div className="card" style={{ maxHeight: 'calc(100vh - 220px)', overflow:'auto' }}>
            {liveRuns.filter(rid => { if (filterService && runServices[rid] !== filterService) return false; if (filterStatus && (runsMeta[rid]?.status !== filterStatus)) return false; return true }).map(rid => { const evts = events[rid] || []; const last = evts[evts.length-1]; const ts = last ? new Date(last.timestamp || Date.now()).toLocaleTimeString() : null; return (
              <div key={rid} className="row" style={{ alignItems:'center', gap:6, padding:'6px 4px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: selectedRunId===rid ? '#0f141b' : undefined }} onClick={()=> { try { localStorage.setItem('lastRunId', rid) } catch {}; setSelectedRunId(rid) }}>
                <div style={{ fontWeight: 600, fontSize: 12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rid.slice(0,8)}…</div>
                {runServices[rid] && (<span className="badge">{runServices[rid]}</span>)}
                {runsMeta[rid]?.status && (<span className="badge">{runsMeta[rid]?.status}</span>)}
              </div>
            )})}
            {liveRuns.length===0 && <div style={{ color:'#9ca3af' }}>No runs.</div>}
          </div>
        </div>
      </div>

      {/* Main split: left=Run Detail, right=Chat */}
      <div style={{ flex: 1, display:'flex', gap: 12, minWidth:0 }}>
        {/* Run Detail (left) */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <div className="row" style={{ alignItems:'center', padding: 8, gap: 8, borderBottom:'1px solid var(--border)' }}>
            <button className="btn" onClick={()=> setRunsCollapsed(v=>!v)}>{runsCollapsed ? 'Show List' : 'Hide List'}</button>
            <div style={{ fontWeight: 600 }}>Run Detail</div>
            {selectedRunId && (<><span style={{ color:'#9ca3af' }}>{selectedRunId}</span>{runServices[selectedRunId] && (<span className="badge">{runServices[selectedRunId]}</span>)}{runsMeta[selectedRunId]?.status && (<span className="badge">{runsMeta[selectedRunId]?.status}</span>)}</>)}
            <div style={{ marginLeft:'auto' }} className="row">
              {selectedRunId && (<button className="btn" onClick={()=> { try { navigator.clipboard?.writeText(selectedRunId!) } catch {} }}>Copy ID</button>)}
              {selectedRunId && (<button className="btn" onClick={()=> setSelectedRunId(null)}>Close</button>)}
            </div>
          </div>
          <div className="messages" style={{ flex:1, minHeight:0 }}>
            {!selectedRunId && (<div style={{ color:'#9ca3af' }}>Select a run to view events.</div>)}
            {selectedRunId && ((events[selectedRunId] || []).map((e,i) => { const ts = new Date(e.timestamp || Date.now()).toLocaleTimeString(); const typ = e.type || e.event_type; return (
              <div key={i} className={`msg assistant`}>
                <div className="meta">{typ} · {ts}</div>
                <div className="bubble">{summarize(e)}</div>
              </div>
            )}))}
          </div>
        </div>
        {/* Chat (right) */}
        <div style={{ width: 460 }}>
          <RunChat
            selectedAgent={selectedAgent}
            sessions={sessions}
            selectedSession={selectedSession}
            messages={messages}
            streaming={streaming}
            SessionSelector={SessionSelector}
            onUseCompanion={attachCompanion}
            onSend={send}
            onToggleStreaming={setStreaming}
          />
        </div>
      </div>
    </div>
  )
}


