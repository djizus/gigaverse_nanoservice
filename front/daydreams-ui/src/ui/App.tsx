import React, { useEffect, useMemo, useState } from 'react';
import { Api, getBaseUrl, setBaseUrl } from '../api';
import type { AgentConfig, Message, Session } from '../types';

export function App() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [apiUrl, setApiUrl] = useState<string>(getBaseUrl());
  const [contexts, setContexts] = useState<string[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(true);
  const knownModels = [
    // Default first
    'google-vertex/gemini-2.5-flash',
    // Supported list
    'openai/gpt-4-turbo',
    'google-vertex/gemini-2.5-pro',
    'anthropic/claude-sonnet-4-20250514',
    'xai/grok-4-0709',
    'openai/gpt-5',
    'openai/gpt-4o-mini',
    'chutes/deepseek-v3.1',
  ];
  const fallbackContexts = ['gigaverse', 'chat'];
  // Dungeon form state & live events
  const [dgPlayer, setDgPlayer] = useState('');
  const [dgToken, setDgToken] = useState('');
  const [dgDungeonId, setDgDungeonId] = useState(1);
  const [dgRuns, setDgRuns] = useState(1);
  const [dgJuiced, setDgJuiced] = useState(false);
  const [dgContext, setDgContext] = useState('Be aggressive in combat.\nPrioritize attack and armor upgrades when looting, but loot heal when you are below 50% health.');
  const [dgModel, setDgModel] = useState(knownModels[0]);
  const [liveEvents, setLiveEvents] = useState<Record<string, any[]>>({});
  const [liveRuns, setLiveRuns] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const detailRef = React.useRef<HTMLDivElement | null>(null);

  // Load contexts and agents on boot
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load contexts and agents on boot
  useEffect(() => {
    (async () => {
      try {
        const [ctx, ags] = await Promise.all([Api.listContexts(), Api.listAgents()]);
        setContexts(ctx && ctx.length ? ctx : fallbackContexts);
        setAgents(ags);
        // Load existing runs (started/processing)
        try {
          const runs = await Api.listRuns(['started','processing']);
          const ids = runs.map((r: any) => r.id).filter(Boolean);
          if (ids.length) setLiveRuns(prev => Array.from(new Set([...ids, ...prev])));
          const map: Record<string, any[]> = {};
          for (const r of runs) {
            const details = Array.isArray(r.details) ? r.details : [];
            map[r.id] = details.map((d: any) => ({ type: d.event_type || d.type, timestamp: d.timestamp, ...d }));
          }
          setLiveEvents(prev => ({ ...map, ...prev }));
        } catch (e: any) {
          setError(`Runs load failed: ${e.message || e}`);
        }
      } catch (e: any) {
        // Fallback contexts if API not reachable yet
        setContexts(fallbackContexts);
        setError(e.message);
      }
    })();
  }, []);

  // Load sessions when agent changes
  useEffect(() => {
    if (!selectedAgent) {
      setSessions([]);
      setSelectedSession(null);
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const sess = await Api.listSessions(selectedAgent.id);
        setSessions(sess);
        setSelectedSession(sess[0] || null);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [selectedAgent?.id]);

  // Load messages when session changes
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const msgs = await Api.listMessages(selectedSession.id);
        setMessages(msgs);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [selectedSession?.id]);

  // Subscribe to global dungeon events SSE
  useEffect(() => {
    let cancelled = false;
    try {
      const es = new EventSource(`${getBaseUrl()}/dungeon/events`);
      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (!evt?.runId) return;
          setLiveEvents(prev => ({ ...prev, [evt.runId]: [...(prev[evt.runId] || []), evt] }));
          setLiveRuns(prev => (prev.includes(evt.runId) ? prev : [evt.runId, ...prev]));
        } catch {}
      };
      es.onerror = () => { /* auto-reconnect by browser */ };
      return () => { cancelled = true; es.close(); };
    } catch {
      // ignore
    }
  }, [apiUrl]);

  // Autoscroll to latest event when selected run updates
  useEffect(() => {
    if (!selectedRunId) return;
    const el = detailRef.current;
    if (!el) return;
    // small timeout to allow DOM to paint
    const t = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(t);
  }, [selectedRunId, liveEvents[selectedRunId || '']]);

  async function handleCreateAgent(form: FormData) {
    try {
      setLoading(true);
      setError(null);
      const name = String(form.get('name') || 'Gigaverse Agent');
      const model = String(form.get('model') || '') || knownModels[0];
      const context = String(form.get('context') || '') || (contexts[0] || 'gigaverse');
      const description = String(form.get('description') || '') || 'Gigaverse tactical assistant';
      const instructions = String(form.get('instructions') || '') || 'Be concise, helpful, and contextual.';
      if (!name) throw new Error('Name is required');
      if (!model) throw new Error('Model is required');
      if (!context) throw new Error('Context is required');
      const agent = await Api.createAgent({ name, model, context, description, instructions });
      setAgents(a => [agent, ...a]);
      setSelectedAgent(agent);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function ensureGigaverseAgent() {
    try {
      setLoading(true);
      setError(null);
      const list = await Api.listAgents();
      const existing = list.filter(a => a.name.toLowerCase() === 'gigaverse agent');
      // Delete all with that name to recreate cleanly
      for (const a of existing) {
        try { await Api.deleteAgent(a.id); } catch {}
      }
      const agent = await Api.createAgent({
        name: 'Gigaverse Agent',
        model: knownModels[0],
        context: (contexts.find(c => c === 'gigaverse') ?? contexts[0] ?? 'gigaverse'),
        description: 'Gigaverse tactical assistant',
        instructions: 'You assist with Gigaverse tasks. Be concise and contextual.'
      });
      const updated = await Api.listAgents();
      setAgents(updated);
      setSelectedAgent(agent);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAgent(agent: AgentConfig) {
    if (!confirm(`Delete agent ${agent.name}?`)) return;
    try {
      setLoading(true);
      await Api.deleteAgent(agent.id);
      setAgents(a => a.filter(x => x.id !== agent.id));
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(message: string) {
    if (!selectedAgent) return;
    try {
      setLoading(true);
      if (!streaming) {
        const payload = { message, sessionId: selectedSession?.id } as any;
        const res = await Api.sendMessage(selectedAgent.id, payload);
        if (!selectedSession || res.sessionId !== selectedSession.id) {
          const sess = await Api.listSessions(selectedAgent.id);
          setSessions(sess);
          const current = sess.find(s => s.id === res.sessionId) || sess[0] || null;
          setSelectedSession(current);
        }
        const msgs = await Api.listMessages(res.sessionId);
        setMessages(msgs);
      } else {
        // Streaming path
        const localSessionId = selectedSession?.id;
        // optimistic UI: append user + assistant placeholder
        const now = new Date().toISOString();
        const tempUser = { id: `local-user-${now}`, sessionId: localSessionId || 'pending', agentId: selectedAgent.id, role: 'user' as const, content: message, createdAt: now };
        const tempAssistant = { id: `local-asst-${now}`, sessionId: localSessionId || 'pending', agentId: selectedAgent.id, role: 'assistant' as const, content: '', createdAt: now };
        setMessages(prev => [...prev, tempUser, tempAssistant]);

        let newSessionId: string | undefined;
        await Api.sendMessageStream(
          selectedAgent.id,
          { message, sessionId: selectedSession?.id },
          (ev) => {
            if (ev.type === 'start') {
              newSessionId = ev.sessionId;
              // sync sessions + selected if we didn't have one
              if (!selectedSession) {
                Api.listSessions(selectedAgent.id).then(sess => {
                  setSessions(sess);
                  const current = sess.find(s => s.id === newSessionId) || sess[0] || null;
                  setSelectedSession(current);
                });
              }
            } else if (ev.type === 'delta') {
              setMessages(prev => {
                const out = [...prev];
                const last = out[out.length - 1];
                if (last && last.role === 'assistant') {
                  last.content += ev.delta || '';
                }
                return out;
              });
            } else if (ev.type === 'done') {
              // Final sync from server
              const sid = newSessionId || selectedSession?.id;
              if (sid) {
                Api.listMessages(sid).then(setMessages).catch(() => {});
              }
            }
          }
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const AgentList = useMemo(() => (
    <div className="list">
      {agents.map(a => (
        <div key={a.id} className="card" style={{ cursor: 'pointer', borderColor: selectedAgent?.id === a.id ? '#93c5fd' : undefined }}>
          <div className="row" onClick={() => setSelectedAgent(a)}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{a.model} · {a.context}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span className="badge">{a.status}</span>
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => setSelectedAgent(a)}>Open</button>
            <button className="btn btn-danger" onClick={() => handleDeleteAgent(a)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  ), [agents, selectedAgent]);

  const SessionSelector = (
    <div className="row">
      <select value={selectedSession?.id || ''} onChange={(e) => {
        const id = e.target.value;
        setSelectedSession(sessions.find(s => s.id === id) || null);
      }}>
        <option value="">New Session</option>
        {sessions.map(s => (
          <option key={s.id} value={s.id}>{s.title || s.id.slice(0, 8)} · {new Date(s.createdAt).toLocaleString()}</option>
        ))}
      </select>
      <button className="btn" onClick={() => setSelectedSession(null)}>Reset</button>
    </div>
  );

  return (
    <div>
      <div className="header">
        <strong>Daydreams Agents UI</strong>
        <button className="btn" onClick={() => setTheme(t => t==='dark'?'light':'dark')}>{theme==='dark' ? '☀️ Light' : '🌙 Dark'}</button>
        <span style={{ color: '#666' }}>API:</span>
        <input style={{ width: 320 }} value={apiUrl} onChange={(e) => { setApiUrl(e.target.value); setBaseUrl(e.target.value); }} />
        <span style={{ color: '#666' }}>Contexts:</span>
        <span>{contexts.join(', ') || 'loading...'}</span>
        {loading && <span className="badge">loading</span>}
        {error && <span className="badge" style={{ background: '#fee2e2', borderColor: '#fecaca', color:'#991b1b' }}>{error}</span>}
      </div>
      <div className="container">
        <div className="sidebar">
          <div className="card" style={{ marginBottom: 12 }}>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateAgent(new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Create Agent</div>
              <div style={{ marginBottom: 8 }}>
                <label htmlFor="name">Name</label>
                <input id="name" name="name" placeholder="Name" defaultValue="Gigaverse Agent" />
              </div>
              <div className="row" style={{ marginBottom: 8 }}>
                <div>
                  <label htmlFor="model">Model</label>
                  <select id="model" name="model" defaultValue={knownModels[0]}>
                    {knownModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="context">Context</label>
                  <select id="context" name="context" defaultValue={(contexts.find(c => c==='gigaverse') ?? contexts[0] ?? 'gigaverse')}>
                    {(contexts.length ? contexts : fallbackContexts).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label htmlFor="description">Description</label>
                <input id="description" name="description" placeholder="Description (optional)" defaultValue="Gigaverse tactical assistant" />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label htmlFor="instructions">Instructions</label>
                <textarea id="instructions" name="instructions" placeholder="Instructions (optional)" style={{ minHeight: 140 }} defaultValue="You assist with Gigaverse gameplay, dungeon strategies and agent tasks. Be concise, helpful, and contextual."></textarea>
              </div>
              <div className="row">
                <button className="btn btn-primary" type="submit">Create</button>
                <button className="btn btn-secondary" type="button" onClick={ensureGigaverseAgent}>Quick: Base Gigaverse Agent</button>
              </div>
            </form>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Agents</div>
          {AgentList}

          <div style={{ fontWeight: 600, margin: '16px 0 8px' }}>Start Dungeon Run</div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Player Address</label>
              <input value={dgPlayer} onChange={(e) => setDgPlayer(e.target.value)} placeholder="0x..." />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Gigaverse Token</label>
              <textarea style={{ minHeight: 80 }} value={dgToken} onChange={(e) => setDgToken(e.target.value)} placeholder="JWT token" />
            </div>
            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <label>Dungeon</label>
                <select value={dgDungeonId} onChange={(e) => setDgDungeonId(parseInt(e.target.value))}>
                  {[1,2,3,4,5].map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
              <div>
                <label>Runs</label>
                <input type="number" min={1} max={100} value={dgRuns} onChange={(e) => setDgRuns(parseInt(e.target.value || '1'))} />
              </div>
            </div>
            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <label>Model</label>
                <select value={dgModel} onChange={(e) => setDgModel(e.target.value)}>
                  {knownModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ alignItems: 'center', display: 'flex' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={dgJuiced} onChange={(e) => setDgJuiced(e.target.checked)} />
                  Juiced
                </label>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Instructions</label>
              <textarea style={{ minHeight: 100 }} value={dgContext} onChange={(e) => setDgContext(e.target.value)} />
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  if (!dgPlayer || !dgToken) throw new Error('Player address and token are required');
                  const res = await Api.startDungeon({
                    context: dgContext,
                    playerAddress: dgPlayer,
                    gigaverseToken: dgToken,
                    totalRuns: dgRuns,
                    dungeonId: dgDungeonId,
                    isJuiced: dgJuiced,
                    llmModel: dgModel,
                  });
                  setLiveRuns(prev => (prev.includes(res.runId) ? prev : [res.runId, ...prev]));
                } catch (e: any) {
                  setError(e.message);
                } finally { setLoading(false); }
              }}>Start</button>
            </div>
          </div>
        </div>
        <div className="content">
          {!selectedAgent && <div className="card">Select an agent or create a new one.</div>}
          {selectedAgent && (
            <div className="chat">
              <div className="row" style={{ alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{selectedAgent.name}</div>
                <div style={{ color: '#666' }}>{selectedAgent.model} · {selectedAgent.context}</div>
                <div style={{ marginLeft: 'auto' }}>{SessionSelector}</div>
              </div>
              <div className="messages" id="messages">
                {messages.map(m => (
                  <div key={m.id} className={`msg ${m.role}`}>
                    <div className="meta">{m.role} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                    <div className="bubble">{m.content}</div>
                  </div>
                ))}
                {messages.length === 0 && <div style={{ color: '#666' }}>No messages yet.</div>}
              </div>
              <MessageInput onSend={handleSendMessage} disabled={!selectedAgent} streaming={streaming} onToggleStreaming={setStreaming} />
            </div>
          )}

          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Live Runs</div>
            {liveRuns.length === 0 && <div style={{ color: '#666' }}>No runs yet.</div>}
            {liveRuns.map(rid => {
              const events = liveEvents[rid] || [];
              const last = events[events.length - 1];
              // Derive stage-room badge
              const stage = (last && (last.stage || (last.state && last.state.stage))) || undefined;
              const roomInStage = (last && (last.roomInStage || (last.state && last.state.roomInStage))) || undefined;
              const absRoom = (last && (last.absRoom || (last.room))) || undefined;
              return (
                <div key={rid} className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rid}</div>
                    <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{last ? `${last.type} · ${new Date(last.timestamp || Date.now()).toLocaleTimeString()}` : 'waiting...'}</span>
                      {stage && roomInStage && (
                        <span className="badge">Stage {stage}-{roomInStage}{absRoom ? ` (abs ${absRoom})` : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="toolbar">
                    <button className="btn" onClick={() => setSelectedRunId(rid)}>Open</button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedRunId && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>Run Detail</div>
                <div style={{ color: '#666' }}>{selectedRunId}</div>
                <div style={{ marginLeft: 'auto' }} className="toolbar">
                  <button className="btn" onClick={() => { navigator.clipboard?.writeText(selectedRunId || ''); }}>Copy ID</button>
                  <button className="btn btn-danger" onClick={() => {
                    setLiveEvents(prev => ({ ...prev, [selectedRunId!]: [] }));
                  }}>Clear</button>
                  <button className="btn" onClick={() => setSelectedRunId(null)}>Close</button>
                </div>
              </div>
              <div className="messages" style={{ maxHeight: 380 }} ref={detailRef}>
                {(liveEvents[selectedRunId] || []).map((e, i) => {
                  const ts = new Date(e.timestamp || Date.now()).toLocaleTimeString();
                  let summary = '';
                  if (e.type === 'room_entered') {
                    const stage = e.stage || e.state?.stage;
                    const roomInStage = e.roomInStage || e.state?.roomInStage;
                    summary = `Entered stage ${stage}-${roomInStage} (abs ${e.room || e.state?.currentRoom}) · enemy ${e.enemy}`;
                  } else if (e.type === 'combat_move') {
                    summary = `Move: ${e.move} · charges: ${e.playerCharges}`;
                  } else if (e.type === 'battle_result') {
                    summary = `Result: ${e.result} · HP ${e.playerHP}/${e.enemyHP}`;
                  } else if (e.type === 'loot_phase') {
                    summary = `Loot phase: ${Array.isArray(e.lootOptions) ? e.lootOptions.length : 0} options`;
                  } else if (e.type === 'loot_selected') {
                    if (e.gainedFrom === 'combat') {
                      // Show item gains by rarity if available
                      const rar = e.byRarityDelta ? Object.entries(e.byRarityDelta).map(([k,v]) => `${k}+${v}`).join(', ') : '';
                      summary = `Combat loot: +${e.itemsGainedNow} item(s)` + (rar ? ` (${rar})` : '');
                    } else {
                      // Show stat bonuses
                      const sd = e.statsDelta || {};
                      const parts = Object.keys(sd).map(k => `${k} +${sd[k]}`).join(', ');
                      summary = `Loot: ${e.lootChoice || ''}` + (parts ? ` · ${parts}` : '');
                    }
                  } else if (e.type === 'run_completed') {
                    const tally = e.statsTally ? ` · stats: ${Object.entries(e.statsTally).map(([k,v])=>`${k}+${v}`).join(', ')}` : '';
                    summary = e.status === 'completed' ? `Run completed · rooms ${e.roomsCleared}${tally}` : `Run ended: ${e.status}`;
                  } else if (e.type === 'all_runs_completed') {
                    summary = `All runs completed ${e.completedRuns}/${e.totalRuns} · successRate: ${Math.round((e.successRate||0))}%`;
                  } else if (e.type === 'agent_decision_move') {
                    summary = `Agent decided: move=${(e.message||'').split(': ')[1] || ''}`;
                  } else if (e.type === 'agent_decision_loot') {
                    summary = `Agent decided: loot=${(e.message||'').split(': ')[1] || ''}`;
                  } else if (e.type === 'error' || e.type === 'agent_error') {
                    summary = e.message || 'Error';
                  }
                  return (
                    <div key={i} className={`msg assistant`}>
                      <div className="meta">{e.type} · {ts}</div>
                      <div className="bubble">
                        {summary ? <div style={{ marginBottom: 6 }}>{summary}</div> : null}
                        <code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(e)}</code>
                      </div>
                    </div>
                  );
                })}
                {(liveEvents[selectedRunId] || []).length === 0 && (
                  <div style={{ color: '#666' }}>No events yet for this run.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageInput({ onSend, disabled, streaming, onToggleStreaming }: { onSend: (m: string) => void; disabled?: boolean; streaming: boolean; onToggleStreaming: (v: boolean) => void }) {
  const [value, setValue] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!value.trim()) return; onSend(value.trim()); setValue(''); }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type a message..." disabled={disabled} />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={streaming} onChange={(e) => onToggleStreaming(e.target.checked)} />
          Stream
        </label>
        <button className="btn btn-primary" type="submit" disabled={disabled}>Send</button>
      </div>
    </form>
  );
}
