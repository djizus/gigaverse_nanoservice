
import React from 'react'
import { supabase } from '../lib/supabase'
import { setAuthToken } from '../api/client'

export default function LoginRoute() {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string|undefined>()
  const [ok, setOk] = React.useState('')

  async function signin(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Supabase env not set'); return }
    setError(undefined)
    setOk('')
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

  async function signup(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Supabase env not set'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(undefined)
    setOk('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); return }
    const token = data.session?.access_token
    if (token) {
      setAuthToken(token)
      setOk('Account created and signed in')
      try { localStorage.setItem('authToken', token) } catch {}
    } else {
      setOk('Account created. Check your email to confirm.')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button type="button" className={mode === 'signin' ? 'btn btn-primary' : 'btn'} onClick={() => setMode('signin')}>Login</button>
        <button type="button" className={mode === 'signup' ? 'btn btn-primary' : 'btn'} onClick={() => setMode('signup')}>Sign up</button>
      </div>

      {mode === 'signin' ? (
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
      ) : (
        <form onSubmit={signup}>
          <div style={{ marginBottom: 8 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e)=> setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e)=> setPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Confirm password</label>
            <input type="password" value={confirm} onChange={(e)=> setConfirm(e.target.value)} required />
          </div>
          <button className="btn" type="submit">Create account</button>
        </form>
      )}

      {error && <div style={{ color:'#ef4444', marginTop:8 }}>{error}</div>}
      {ok && <div style={{ color:'#22c55e', marginTop:8 }}>{ok}</div>}
    </div>
  )
}
