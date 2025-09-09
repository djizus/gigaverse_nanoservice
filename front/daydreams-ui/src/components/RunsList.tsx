import React, { useState } from 'react';

interface RunsListProps {
  liveRuns: string[];
  selectedRunId: string | null;
  setSelectedRunId: (runId: string | null) => void;
  liveEvents: Record<string, any[]>;
  runServices: Record<string, string>;
  runsMeta: Record<string, { status?: string; created_at?: string; service_id?: string }>;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function RunsList({
  liveRuns,
  selectedRunId,
  setSelectedRunId,
  liveEvents,
  runServices,
  runsMeta,
  loading,
  onRefresh
}: RunsListProps) {
  const [filterService, setFilterService] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRuns = liveRuns.filter(rid => {
    if (filterService && runServices[rid] !== filterService) return false;
    if (filterStatus && runsMeta[rid]?.status !== filterStatus) return false;
    if (searchTerm && !rid.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const uniqueServices = Array.from(new Set(Object.values(runServices)));
  const uniqueStatuses = ['started', 'processing', 'completed', 'failed', 'aborted'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 8 }}>
      {/* Filters */}
      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Search by ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: 4 }}
        />
        
        <div className="row" style={{ gap: 4, marginBottom: 4 }}>
          <select 
            value={filterService} 
            onChange={(e) => setFilterService(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">All Services</option>
            {uniqueServices.map(svc => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="btn" 
          onClick={onRefresh} 
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Runs List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredRuns.length === 0 && (
          <div style={{ color: '#666', padding: 8, textAlign: 'center' }}>
            No runs found
          </div>
        )}
        
        {filteredRuns.map(rid => {
          const events = liveEvents[rid] || [];
          const lastEvent = events[events.length - 1];
          const meta = runsMeta[rid] || {};
          const createdAt = meta.created_at ? new Date(meta.created_at).toLocaleTimeString() : '';
          
          return (
            <div
              key={rid}
              className="card"
              style={{
                marginBottom: 4,
                padding: 8,
                cursor: 'pointer',
                backgroundColor: selectedRunId === rid ? 'var(--bg-secondary)' : undefined,
                border: selectedRunId === rid ? '2px solid var(--primary)' : '1px solid var(--border)'
              }}
              onClick={() => setSelectedRunId(rid)}
            >
              <div style={{ fontWeight: selectedRunId === rid ? 600 : 400 }}>
                {rid.slice(0, 8)}...
              </div>
              
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {createdAt && <span>{createdAt}</span>}
              </div>
              
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {runServices[rid] && (
                  <span className="badge" style={{ fontSize: 10 }}>
                    {runServices[rid]}
                  </span>
                )}
                {meta.status && (
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: 10,
                      backgroundColor: 
                        meta.status === 'completed' ? '#dcfce7' :
                        meta.status === 'failed' ? '#fee2e2' :
                        meta.status === 'processing' ? '#fef3c7' :
                        undefined
                    }}
                  >
                    {meta.status}
                  </span>
                )}
              </div>
              
              {lastEvent && (
                <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                  Last: {lastEvent.type}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}