import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { setAuthToken } from '../api';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const enabled = !!supabase;

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserEmail(data?.session?.user?.email ?? null);
      setAuthToken(data?.session?.access_token || undefined);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthToken(session?.access_token || undefined);
    });
    return () => { active = false; sub?.subscription?.unsubscribe(); };
  }, []);

  async function login() {
    if (!supabase) return;
    try {
      setStatus('Logging in...');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus('Logged in');
    } catch (e: any) {
      setStatus(e?.message || 'Login failed');
    }
  }

  async function register() {
    if (!supabase) return;
    try {
      setStatus('Registering...');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setStatus('Registered. Check your email if confirm required.');
    } catch (e: any) {
      setStatus(e?.message || 'Register failed');
    }
  }

  async function logout() {
    if (!supabase) return;
    try {
      setStatus('Logging out...');
      await supabase.auth.signOut();
      setStatus('Logged out');
    } catch (e: any) {
      setStatus(e?.message || 'Logout failed');
    }
  }

  if (!enabled) {
    return (
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Auth</div>
        <div style={{ color: '#666' }}>Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Auth</div>
      {userEmail ? (
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <span>Signed in as {userEmail}</span>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); login(); }}>
          <div className="row" style={{ gap: 8 }}>
            <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn btn-primary" type="submit">Login</button>
            <button className="btn" type="button" onClick={register}>Register</button>
          </div>
        </form>
      )}
      {status && <div style={{ marginTop: 8, color: '#666' }}>{status}</div>}
    </div>
  );
}

