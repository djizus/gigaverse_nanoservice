import React from 'react'
import { Link } from '@tanstack/react-router'
import { Api } from '../api/client'
import type { ServiceManifest } from '../api/types'

export default function ServicesRoute() {
  const [services, setServices] = React.useState<ServiceManifest[]>([])
  const [error, setError] = React.useState<string|undefined>()
  React.useEffect(() => { (async ()=>{ try { setServices(await Api.listServices()) } catch(e:any){ setError(e?.message || 'Failed') } })() }, [])
  return (
    <div className="card">
      <div className="row" style={{ alignItems:'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Services</div>
        <div style={{ color:'#9ca3af' }}>{services.length} available</div>
        {error && <div style={{ color: '#ef4444' }}>{error}</div>}
      </div>
      <div className="row" style={{ flexWrap:'wrap', gap: 12 }}>
        {services.map(s => (
          <div key={`${s.developer}:${s.serviceId}`} className="card" style={{ width: 300 }}>
            <div className="row" style={{ alignItems:'center' }}>
              <div style={{ fontWeight: 600 }}>{s.serviceId}</div>
              <div style={{ color:'#9ca3af' }}>{s.version}</div>
            </div>
            {s.summary && <div style={{ color:'#9ca3af' }}>{s.summary}</div>}
            <div className="row" style={{ marginTop: 8 }}>
              <Link className="btn" to={`/services/workspace`} search={{ developer: s.developer, service: s.serviceId }}>Open</Link>
              <button className="btn" onClick={()=> window.location.hash = `#/services/workspace?developer=${encodeURIComponent(s.developer)}&service=${encodeURIComponent(s.serviceId)}`}>Launch</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
