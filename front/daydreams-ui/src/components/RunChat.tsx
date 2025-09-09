import React, { useState, useEffect, useRef } from 'react';
import type { AgentConfig, Session, Message } from '../types';

interface RunChatProps {
  selectedAgent: AgentConfig | null;
  sessions: Session[];
  selectedSession: Session | null;
  messages: Message[];
  streaming: boolean;
  onSend: (message: string) => void;
  onToggleStreaming: (streaming: boolean) => void;
  setSelectedSession: (session: Session | null) => void;
}

export function RunChat({
  selectedAgent,
  sessions,
  selectedSession,
  messages,
  streaming,
  onSend,
  onToggleStreaming,
  setSelectedSession
}: RunChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedAgent) return;
    
    onSend(inputValue.trim());
    setInputValue('');
  };

  if (!selectedAgent) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        <p>No companion agent selected</p>
        <p style={{ fontSize: 12 }}>Create a companion agent to start chatting</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Session Selector */}
      <div className="row" style={{ 
        padding: 8, 
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
        gap: 8
      }}>
        <label style={{ fontSize: 12 }}>Session:</label>
        <select 
          value={selectedSession?.id || ''} 
          onChange={(e) => {
            const id = e.target.value;
            setSelectedSession(sessions.find(s => s.id === id) || null);
          }}
          style={{ flex: 1 }}
        >
          <option value="">New Session</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.title || s.id.slice(0, 8)} · {new Date(s.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
        <button 
          className="btn" 
          onClick={() => setSelectedSession(null)}
          style={{ fontSize: 12 }}
        >
          New
        </button>
      </div>

      {/* Messages Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: 12,
        backgroundColor: 'var(--bg-secondary)'
      }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: 20,
            fontSize: 14
          }}>
            No messages yet. Start a conversation!
          </div>
        )}
        
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{ maxWidth: '70%' }}>
              <div style={{ 
                fontSize: 10, 
                color: '#666', 
                marginBottom: 2,
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {msg.role} · {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                  color: msg.role === 'user' ? 'white' : 'inherit',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{ 
        padding: 8, 
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg)'
      }}>
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={!selectedAgent}
            style={{ flex: 1 }}
          />
          
          <label style={{ 
            display: 'flex', 
            gap: 4, 
            alignItems: 'center',
            fontSize: 12
          }}>
            <input 
              type="checkbox" 
              checked={streaming} 
              onChange={(e) => onToggleStreaming(e.target.checked)} 
            />
            Stream
          </label>
          
          <button 
            className="btn btn-primary" 
            type="submit" 
            disabled={!selectedAgent || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}