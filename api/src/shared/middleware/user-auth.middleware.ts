import { Context, Next } from 'hono';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserAuthOptions {
  supabaseUrl: string;
  supabaseKey: string;
  // When true, allow X-User-Id header as dev fallback (e.g., with memory adapter)
  allowDevHeader?: boolean;
}

export const createUserAuthMiddleware = (opts: UserAuthOptions) => {
  const supabase: SupabaseClient = createClient(opts.supabaseUrl, opts.supabaseKey);

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;
    const isDebug = process.env.LOG_LEVEL === 'debug';
    try {
      if (isDebug) console.log(`[UserAuth] ${method} ${path} begin`);
      // Allow CORS preflight without auth checks
      if (method === 'OPTIONS') {
        if (isDebug) console.log('[UserAuth] OPTIONS preflight -> next()');
        return next();
      }
    

    // Dev fallback first (when allowed): X-User-Id header or ?userId
    if (opts.allowDevHeader) {
      const headerUser = c.req.header('x-user-id') || c.req.header('X-User-Id');
      const qsUser = c.req.query('userId');
      if (headerUser || qsUser) {
        if (isDebug) console.log('[UserAuth] Dev mode user:', headerUser || qsUser);
        c.set('userId', headerUser || qsUser);
        const res = await next();
        if (isDebug) console.log(`[UserAuth] ${method} ${path} end (dev user)`);
        return res;
      }
    }

    // Try Authorization: Bearer <token>
    const auth = c.req.header('authorization') || c.req.header('Authorization');
    if (isDebug) console.log(`[UserAuth] Authorization header ${auth ? 'present' : 'absent'}`);
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.substring(7);
      try {
        // Optional fast path: trust JWT claims without remote verification (for environments where outbound is restricted)
        if (process.env.SUPABASE_FAST_JWT === 'true') {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            const sub = payload?.sub || payload?.user_metadata?.sub;
            const iss = String(payload?.iss || '');
            // Basic sanity checks: issuer matches configured Supabase URL domain
            if (sub && iss.includes(new URL(opts.supabaseUrl).host)) {
            if (isDebug) console.log('[UserAuth] Fast JWT path accepted userId=', sub);
            c.set('userId', sub);
            const res = await next();
            if (isDebug) console.log(`[UserAuth] ${method} ${path} end (fast jwt)`);
            return res;
          } else {
            if (isDebug) console.warn('[UserAuth] Fast JWT path rejected: invalid iss/sub');
          }
        }
      }

        // Add timeout to avoid hanging if Supabase is unreachable
        const timeoutMs = 5000;
        const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('AuthProviderTimeout')), timeoutMs));
        const result: any = await Promise.race([supabase.auth.getUser(token), timer]);
        const { data, error } = result || {};
        if (error) {
          console.warn('[UserAuth] Supabase token invalid:', error.message);
        } else if (data?.user?.id) {
          if (isDebug) console.log('[UserAuth] Supabase getUser OK userId=', data.user.id);
          c.set('userId', data.user.id);
          const res = await next();
          if (isDebug) console.log(`[UserAuth] ${method} ${path} end (auth OK)`);
          return res;
        }
      } catch (e: any) {
        if (e?.message === 'AuthProviderTimeout') {
          console.warn('[UserAuth] Supabase getUser timeout');
        } else {
          console.warn('[UserAuth] Supabase getUser failed:', e?.message || e);
        }
      }
      // If token provided but invalid, reject unless dev header allowed and present
      if (!opts.allowDevHeader) {
        console.warn('[UserAuth] Rejecting: token provided but invalid and dev header not allowed');
        return c.json({ error: 'Unauthorized' }, 401);
      }
    }


    if (isDebug) console.warn('[UserAuth] Unauthorized (no valid token, no dev header)');
    return c.json({ error: 'Unauthorized' }, 401);
    } finally {
      // no-op
    }
  };
};
