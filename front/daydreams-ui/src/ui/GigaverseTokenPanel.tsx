import React, { useEffect, useState } from 'react';
import { Api } from '../api';

export function GigaverseTokenPanel() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string>('');
  const [hasToken, setHasToken] = useState<boolean>(false);

  async function refresh() {
    try {
      const res = await Api.getGigaverseToken();
      setHasToken(!!res?.hasToken);
      setStatus(res?.hasToken ? 'Token stored' : 'No token');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to get token status');
    }
  }

  useEffect(() => { refresh(); }, []);

  async function save() {
    try {
      setStatus('Saving...');
      await Api.setGigaverseToken(token.trim());
      setToken('');
      await refresh();
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save token');
    }
  }

  async function remove() {
    try {
      setStatus('Removing...');
      await Api.deleteGigaverseToken();
      await refresh();
    } catch (e: any) {
      setStatus(e?.message || 'Failed to remove token');
    }
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Gigaverse Token</div>
      <div style={{ color: hasToken ? '#166534' : '#991b1b' }}>
        {hasToken ? 'A token is stored for your account.' : 'No token stored for your account.'}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
        <input type="password" placeholder="Paste token..." value={token} onChange={(e)=> setToken(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={save} disabled={!token.trim()}>Save</button>
        <button className="btn" onClick={refresh}>Check</button>
        <button className="btn btn-danger" onClick={remove}>Remove</button>
      </div>
      {status && <div style={{ marginTop: 8, color: '#666' }}>{status}</div>}
    </div>
  );
}

