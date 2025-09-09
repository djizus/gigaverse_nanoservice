import React from 'react';
import { useGlobalAgent } from '../context/GlobalAgentProvider';

export function AgentCommandBar() {
  const { execute, suggest } = useGlobalAgent();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [hints, setHints] = React.useState<string[]>([]);
  const [summary, setSummary] = React.useState<string>('');

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const s = await suggest(value).catch(() => []);
      if (alive) setHints(s);
    })();
    return () => { alive = false; };
  }, [value]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80
    }} onClick={() => setOpen(false)}>
      <div style={{ width: 680, background: 'var(--bg)', color: 'var(--text)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const res = await execute(value).catch((err) => ({ summary: String(err?.message || 'error') }));
                setSummary(res.summary);
                setValue('');
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="Type a command… (Ctrl/Cmd+K)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </div>
        <div style={{ maxHeight: 260, overflow: 'auto', padding: 12 }}>
          {hints.map((h) => (
            <div key={h} style={{ padding: '6px 8px', color: 'var(--muted)' }}>{h}</div>
          ))}
          {!hints.length && <div style={{ padding: '6px 8px', color: 'var(--muted)' }}>Try: go services | /service gigaverse-dungeon startRun {`{...}`}</div>}
        </div>
        {summary && (
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>{summary}</div>
        )}
      </div>
    </div>
  );
}
