
import React from 'react'
import { supabase } from '../lib/supabase'
import { setAuthToken } from '../api/client'

export default function LoginRoute() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string|undefined>()
  const [ok, setOk] = React.useState('')

  async function signin(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Supabase env not set'); return }
    setError(undefined)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    const token = data.session?.access_token
    if (token) {
      setAuthToken(token)
      setOk('Logged in')
      try { localStorage.setItem('authToken', token) } catch {}
    } else {
      setError('No session token')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Login</div>
      <form onSubmit={signin}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e)=> setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e)=> setPassword(e.target.value)} required />
        </div>
        <button className="btn" type="submit">Sign in</button>
      </form>
      {error && <div style={{ color:'#ef4444', marginTop:8 }}>{error}</div>}
      {ok && <div style={{ color:'#22c55e', marginTop:8 }}>{ok}</div>}
    </div>
  )
}
