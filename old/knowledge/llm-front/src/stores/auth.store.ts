import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '../types/auth';
import { httpService } from '../services/http.service';
import { extractUserFromJwt, isTokenExpired } from '../utils/jwt';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,

        setUser: (user) => {
          console.log('[AUTH] setUser called:', { user, timestamp: new Date().toISOString() });
          set({ user, isAuthenticated: !!user });
        },

        setToken: (token) => {
          console.log('[AUTH] setToken called:', { hasToken: !!token, timestamp: new Date().toISOString() });
          httpService.setToken(token);
          set({ token, isAuthenticated: !!token });
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },

        logout: () => {
          console.log('[AUTH] logout called:', { timestamp: new Date().toISOString() });
          httpService.setToken(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        },

        checkAuth: async () => {
          console.log('[AUTH] checkAuth started:', { 
            hasToken: !!get().token, 
            currentAuth: get().isAuthenticated,
            timestamp: new Date().toISOString() 
          });
          const token = get().token;
          if (!token) {
            console.log('[AUTH] No token found, setting isAuthenticated to false');
            set({ isAuthenticated: false });
            return;
          }

          try {
            set({ isLoading: true });

            // Check if token is expired
            if (isTokenExpired(token)) {
              console.log('[AUTH] Token expired, logging out');
              get().logout();
              return;
            }

            // Extract user from JWT payload
            const user = extractUserFromJwt(token);
            if (!user) {
              console.error('[AUTH] Failed to extract user from JWT');
              get().logout();
              return;
            }
            console.log('[AUTH] User extracted from JWT:', { userId: user.id, email: user.email });

            console.log('[AUTH] Setting authenticated state');
            set({
              user,
              isAuthenticated: true,
              error: null,
            });
          } catch (error) {
            console.error('[AUTH] Auth check failed:', error);
            get().logout();
          } finally {
            console.log('[AUTH] checkAuth completed:', { isAuthenticated: get().isAuthenticated });
            set({ isLoading: false });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => {
          console.log('[AUTH] Starting rehydration from localStorage');
          return (state, error) => {
            if (error) {
              console.error('[AUTH] Rehydration error:', error);
            } else {
              console.log('[AUTH] Rehydration complete:', { 
                hasToken: !!state?.token, 
                hasUser: !!state?.user,
                isAuthenticated: state?.isAuthenticated,
                timestamp: new Date().toISOString()
              });
              // Set token in http service after rehydration
              if (state?.token) {
                httpService.setToken(state.token);
              }
            }
          };
        },
      },
    ),
  ),
);
