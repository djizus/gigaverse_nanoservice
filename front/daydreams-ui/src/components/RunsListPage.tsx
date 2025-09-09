import { useState, useEffect } from 'react';
import { Api } from '../api';
import { RunsList } from './RunsList';
import { RunDetails } from './RunDetails';
import { RunChat } from './RunChat';
import type { AgentConfig, Session, Message } from '../types';

interface RunsListPageProps {
  agents: AgentConfig[];
  selectedAgent: AgentConfig | null;
  setSelectedAgent: (agent: AgentConfig | null) => void;
  sessions: Session[];
  selectedSession: Session | null;
  setSelectedSession: (session: Session | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  setSessions: (sessions: Session[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setToast: (toast: string | null) => void;
  streaming: boolean;
  setStreaming: (streaming: boolean) => void;
}

export function RunsListPage({
  agents,
  selectedAgent,
  setSelectedAgent,
  sessions,
  selectedSession,
  setSelectedSession,
  messages,
  setMessages,
  setSessions,
  loading,
  setLoading,
  setError,
  setToast,
  streaming,
  setStreaming
}: RunsListPageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [liveRuns, setLiveRuns] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<Record<string, any[]>>({});
  const [runServices, setRunServices] = useState<Record<string, string>>({});
  const [runsMeta, setRunsMeta] = useState<Record<string, { status?: string; created_at?: string; service_id?: string }>>({});
  const [services, setServices] = useState<any[]>([]);

  // Load runs on mount
  useEffect(() => {
    loadRuns();
    loadServices();
  }, []);

  async function loadRuns() {
    try {
      setLoading(true);
      const runs = await Api.listRuns();
      const ids = runs.map((r: any) => r.id).filter(Boolean);
      setLiveRuns(ids);
      
      const meta: Record<string, any> = {};
      const svcMap: Record<string, string> = {};
      const eventsMap: Record<string, any[]> = {};
      
      for (const r of runs) {
        meta[r.id] = { 
          status: r.status, 
          created_at: r.created_at, 
          service_id: r.service_id 
        };
        if (r.service_id) svcMap[r.id] = r.service_id;
        
        const details = Array.isArray(r.details) ? r.details : [];
        eventsMap[r.id] = details.map((d: any) => ({ 
          type: d.event_type || d.type, 
          timestamp: d.timestamp, 
          ...d 
        }));
      }
      
      setRunsMeta(meta);
      setRunServices(svcMap);
      setLiveEvents(eventsMap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadServices() {
    try {
      const svcs = await Api.listServices();
      setServices(Array.isArray(svcs) ? svcs : []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function createCompanionAgent(runId: string) {
    const svcId = runServices[runId];
    const svc = services.find((s: any) => s.serviceId === svcId);
    if (!svc) return;

    try {
      setLoading(true);
      const baseName = `${svc.serviceId} Companion`;
      
      let agent = agents.find(a => 
        (a.name || '').toLowerCase() === baseName.toLowerCase()
      );
      
      if (!agent) {
        agent = await Api.createAgent({
          name: baseName,
          model: 'google-vertex/gemini-2.5-flash',
          context: 'gigaverse',
          description: `${svc.serviceId} service companion`,
          instructions: `You are a companion agent for the ${svc.serviceId} service. Be concise and contextual.`,
        });
      }
      
      setSelectedAgent(agent);
      
      const sess = await Api.listSessions(agent.id);
      setSessions(sess);
      setSelectedSession(sess[0] || null);
      
      if (runId && agent) {
        await Api.setRunCompanion(runId, { agentId: agent.id });
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
        const localSessionId = selectedSession?.id;
        const now = new Date().toISOString();
        
        const tempUser = { 
          id: `local-user-${now}`, 
          sessionId: localSessionId || 'pending', 
          agentId: selectedAgent.id, 
          role: 'user' as const, 
          content: message, 
          createdAt: now 
        };
        
        const tempAssistant = { 
          id: `local-asst-${now}`, 
          sessionId: localSessionId || 'pending', 
          agentId: selectedAgent.id, 
          role: 'assistant' as const, 
          content: '', 
          createdAt: now 
        };
        
        setMessages((prev: Message[]) => [...prev, tempUser, tempAssistant]);

        let newSessionId: string | undefined;
        
        await Api.sendMessageStream(
          selectedAgent.id,
          { message, sessionId: selectedSession?.id },
          (ev) => {
            if (ev.type === 'start') {
              newSessionId = ev.sessionId;
              
              if (!selectedSession) {
                Api.listSessions(selectedAgent.id).then(sess => {
                  setSessions(sess);
                  const current = sess.find(s => s.id === newSessionId) || sess[0] || null;
                  setSelectedSession(current);
                });
              }
            } else if (ev.type === 'delta') {
              setMessages((prev: Message[]) => {
                const out = [...prev];
                const last = out[out.length - 1];
                if (last && last.role === 'assistant') {
                  last.content += ev.delta || '';
                }
                return out;
              });
            } else if (ev.type === 'done') {
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

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 'calc(100vh - 120px)', width: '100%' }}>
        
        {/* Collapsible Sidebar */}
        <div style={{ 
          width: collapsed ? 60 : 320, 
          transition: 'width 0.2s ease', 
          borderRight: '1px solid var(--border)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="row" style={{ 
            alignItems: 'center', 
            padding: 8, 
            gap: 8, 
            borderBottom: '1px solid var(--border)' 
          }}>
            {!collapsed && <strong>Runs</strong>}
            <button 
              className="btn" 
              onClick={() => setCollapsed(!collapsed)} 
              style={{ marginLeft: collapsed ? 0 : 'auto' }}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
          
          {!collapsed && (
            <RunsList
              liveRuns={liveRuns}
              selectedRunId={selectedRunId}
              setSelectedRunId={setSelectedRunId}
              liveEvents={liveEvents}
              runServices={runServices}
              runsMeta={runsMeta}
              loading={loading}
              onRefresh={loadRuns}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex' }}>
          
          {/* Center Panel - Run Details */}
          <div style={{ 
            flex: 1, 
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="row" style={{ 
              alignItems: 'center', 
              padding: 8, 
              gap: 8, 
              borderBottom: '1px solid var(--border)' 
            }}>
              <div style={{ fontWeight: 600 }}>Run Details</div>
              {selectedRunId && (
                <>
                  <span style={{ color: '#666', fontSize: 12 }}>
                    {selectedRunId.slice(0, 8)}...
                  </span>
                  {runServices[selectedRunId] && (
                    <span className="badge">{runServices[selectedRunId]}</span>
                  )}
                  {runsMeta[selectedRunId]?.status && (
                    <span className="badge">{runsMeta[selectedRunId]?.status}</span>
                  )}
                </>
              )}
            </div>
            
            <RunDetails
              selectedRunId={selectedRunId}
              liveEvents={liveEvents}
              setToast={setToast}
            />
          </div>

          {/* Right Panel - Chat */}
          <div style={{ 
            width: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="row" style={{ 
              alignItems: 'center', 
              padding: 8, 
              gap: 8, 
              borderBottom: '1px solid var(--border)' 
            }}>
              <div style={{ fontWeight: 600 }}>Chat</div>
              {selectedAgent && (
                <span style={{ color: '#666', fontSize: 12 }}>
                  {selectedAgent.name}
                </span>
              )}
              <div style={{ marginLeft: 'auto' }} className="toolbar">
                {selectedRunId && !selectedAgent && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => createCompanionAgent(selectedRunId)}
                  >
                    Create Companion
                  </button>
                )}
              </div>
            </div>
            
            <RunChat
              selectedAgent={selectedAgent}
              sessions={sessions}
              selectedSession={selectedSession}
              messages={messages}
              streaming={streaming}
              onSend={handleSendMessage}
              onToggleStreaming={setStreaming}
              setSelectedSession={setSelectedSession}
            />
          </div>
        </div>
    </div>
  );
}