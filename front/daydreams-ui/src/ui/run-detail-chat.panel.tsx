import React from 'react';
import type { AgentConfig, Message, Session } from '../types';

export function RunDetailChatPanel({
  selectedAgent,
  sessions,
  selectedSession,
  messages,
  streaming,
  SessionSelector,
  onUseCompanion,
  onSend,
  onToggleStreaming,
}: {
  selectedAgent: AgentConfig | null;
  sessions: Session[];
  selectedSession: Session | null;
  messages: Message[];
  streaming: boolean;
  SessionSelector: React.ReactNode;
  onUseCompanion: () => void;
  onSend: (m: string) => void;
  onToggleStreaming: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="row" style={{ alignItems:'center' }}>
        <div style={{ fontWeight: 600 }}>Chat</div>
        <div style={{ marginLeft: 'auto' }} className="toolbar">
          <button className="btn" onClick={onUseCompanion}>Use/Create Companion</button>
        </div>
      </div>
      {!selectedAgent && (
        <div style={{ color:'#666' }}>No agent selected. Click “Use/Create Companion” to attach one.</div>
      )}
      {selectedAgent && (
        <>
          <div className="row" style={{ alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{selectedAgent.name}</div>
            <div style={{ color:'#666' }}>{selectedAgent.model} · {selectedAgent.context}</div>
            <div style={{ marginLeft: 'auto' }}>{SessionSelector}</div>
          </div>
          <div className="messages" id="run-chat-messages" style={{ maxHeight: 240 }}>
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="meta">{m.role} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {messages.length === 0 && <div style={{ color: '#666' }}>No messages yet.</div>}
          </div>
          <MessageInput onSend={onSend} disabled={!selectedAgent} streaming={streaming} onToggleStreaming={onToggleStreaming} />
        </>
      )}
    </div>
  );
}

function MessageInput({ onSend, disabled, streaming, onToggleStreaming }: { onSend: (m: string) => void; disabled?: boolean; streaming: boolean; onToggleStreaming: (v: boolean) => void }) {
  const [value, setValue] = React.useState('');
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
