import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { Api, setAuthToken, setDevUserId } from './api';
import { supabase } from './supabase';

// Minimal auth/bootstrap for testing UI
// 1) Dev short-circuit: VITE_DEV_USER_ID -> use memory mode without login
const DEV_USER_ID = (import.meta as any).env?.VITE_DEV_USER_ID as string | undefined;
if (DEV_USER_ID) {
  setDevUserId(DEV_USER_ID);
  console.log(`[UI] Using DEV userId=${DEV_USER_ID} (no login required)`);
}

// 2) Supabase session: set API Authorization if available
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const token = data?.session?.access_token;
    if (token) setAuthToken(token);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token;
    setAuthToken(token);
  });
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
