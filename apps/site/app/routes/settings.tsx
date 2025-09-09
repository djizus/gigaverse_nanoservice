import React from 'react'
import { getBaseUrl, setBaseUrl, setDevUserId } from '../api/client'

export default function SettingsRoute() {
  const [apiUrl, setApiUrl] = React.useState<string>(() => getBaseUrl())
  const [devUser, setDevUser] = React.useState<string>(() => localStorage.getItem('devUserId') || '')
  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Settings</div>
      <div className="row" style={{ alignItems:'center', gap: 8, marginBottom: 8 }}>
        <label style={{ width: 120 }}>API URL</label>
        <input style={{ flex: 1 }} value={apiUrl} onChange={(e)=> setApiUrl(e.target.value)} />
        <button className="btn" onClick={()=> { setBaseUrl(apiUrl); }}>Apply</button>
      </div>
      <div className="row" style={{ alignItems:'center', gap: 8 }}>
        <label style={{ width: 120 }}>Dev User</label>
        <input style={{ flex: 1 }} value={devUser} onChange={(e)=> setDevUser(e.target.value)} />
        <button className="btn" onClick={()=> { try { localStorage.setItem('devUserId', devUser || ''); } catch {}; setDevUserId(devUser || undefined) }}>Save</button>
      </div>
    </div>
  )
}
