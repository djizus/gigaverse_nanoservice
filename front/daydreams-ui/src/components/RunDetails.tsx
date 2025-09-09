import React, { useEffect, useRef } from 'react';

interface RunDetailsProps {
  selectedRunId: string | null;
  liveEvents: Record<string, any[]>;
  setToast: (toast: string | null) => void;
}

export function RunDetails({
  selectedRunId,
  liveEvents,
  setToast
}: RunDetailsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedRunId, liveEvents[selectedRunId || '']]);

  if (!selectedRunId) {
    return (
      <div style={{ padding: 16, color: '#666', textAlign: 'center', flex: 1 }}>
        Select a run to view details
      </div>
    );
  }

  const events = liveEvents[selectedRunId] || [];

  const handleCopyId = () => {
    if (selectedRunId) {
      navigator.clipboard?.writeText(selectedRunId);
      setToast('Run ID copied!');
    }
  };

  const formatEventSummary = (e: any) => {
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
        const rar = e.byRarityDelta ? Object.entries(e.byRarityDelta).map(([k,v]) => `${k}+${v}`).join(', ') : '';
        summary = `Combat loot: +${e.itemsGainedNow} item(s)` + (rar ? ` (${rar})` : '');
      } else {
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
    } else {
      summary = JSON.stringify(e).slice(0, 100);
    }
    
    return { ts, summary };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="toolbar" style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
        <button className="btn" onClick={handleCopyId}>Copy ID</button>
        <button 
          className="btn" 
          onClick={() => {
            if (selectedRunId && liveEvents[selectedRunId]) {
              const eventsJson = JSON.stringify(liveEvents[selectedRunId], null, 2);
              const blob = new Blob([eventsJson], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `run-${selectedRunId}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setToast('Events exported!');
            }
          }}
        >
          Export
        </button>
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {events.length === 0 && (
          <div style={{ color: '#666', textAlign: 'center', padding: 16 }}>
            No events yet for this run
          </div>
        )}
        
        {events.map((e, i) => {
          const { ts, summary } = formatEventSummary(e);
          const isError = e.type === 'error' || e.type === 'agent_error';
          
          return (
            <div
              key={i}
              className="card"
              style={{
                marginBottom: 8,
                padding: 8,
                backgroundColor: isError ? '#fee2e2' : undefined
              }}
            >
              <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="badge" style={{ fontSize: 10 }}>
                  {e.type}
                </span>
                <span style={{ fontSize: 11, color: '#666' }}>{ts}</span>
              </div>
              
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {summary}
              </div>
              
              {e.xml && (
                <details style={{ fontSize: 11 }}>
                  <summary style={{ cursor: 'pointer', color: '#666' }}>
                    Context (XML)
                  </summary>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    backgroundColor: 'var(--bg-secondary)', 
                    padding: 4,
                    borderRadius: 4,
                    marginTop: 4,
                    fontSize: 10
                  }}>
                    {e.xml}
                  </pre>
                </details>
              )}
              
              <details style={{ fontSize: 11 }}>
                <summary style={{ cursor: 'pointer', color: '#666' }}>
                  Raw Data
                </summary>
                <pre style={{ 
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: 4,
                  borderRadius: 4,
                  marginTop: 4,
                  fontSize: 10
                }}>
                  {JSON.stringify(e, null, 2)}
                </pre>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}