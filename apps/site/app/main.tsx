import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/app.css'
import { setAuthToken } from './api/client'
import './styles/neon-theme.css'
import { supabase } from './lib/supabase'

const queryClient = new QueryClient()
// hydrate auth token from localStorage (if any)
try { const savedToken = localStorage.getItem('authToken'); if (savedToken) setAuthToken(savedToken) } catch {}

// Root layout route
const RootComponent: React.FC = () => {
  const [neonTheme, setNeonTheme] = React.useState(() => {
    return localStorage.getItem('neonTheme') === 'true'
  })

  React.useEffect(() => {
    localStorage.setItem('neonTheme', String(neonTheme))
    if (neonTheme) {
      document.body.classList.add('neon-theme')
    } else {
      document.body.classList.remove('neon-theme')
    }
  }, [neonTheme])

  // Track auth status for header avatar
  const [authEmail, setAuthEmail] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthEmail(data?.session?.user?.email ?? null)
      setAuthToken(data?.session?.access_token || undefined)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email ?? null)
      setAuthToken(session?.access_token || undefined)
      try {
        if (session?.access_token) localStorage.setItem('authToken', session.access_token)
        else localStorage.removeItem('authToken')
      } catch {}
    })
    return () => { active = false; sub?.subscription?.unsubscribe() }
  }, [])

  return (
    <div className="app-shell">
      <div className="topbar">
        <strong>Daydreams</strong>
        <div className="spacer" />
        <button 
          className="btn btn-secondary" 
          onClick={() => setNeonTheme(!neonTheme)}
          style={{ marginRight: 8 }}
        >
          {neonTheme ? '🌙 Default' : '💚 Neon'}
        </button>
        <Link to="/runs" className="btn">Runs</Link>
        <Link to="/services" className="btn">Services</Link>
        <Link to="/agents" className="btn">Agents</Link>
        <Link to="/settings" className="btn">Settings</Link>
        {authEmail ? (
          <div title={authEmail} style={{
            width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb',
            color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, marginLeft: 8
          }}>
            {authEmail.slice(0,1).toUpperCase()}
          </div>
        ) : (
          <Link to="/login" className="btn">Login</Link>
        )}
      </div>
      <div className="container">
        <Outlet />
      </div>
    </div>
  )
}
const rootRoute = createRootRoute({ component: RootComponent })

// Index -> redirect to /runs2
const Index = () => {
  React.useEffect(() => { window.location.replace('/runs'); }, [])
  return <div />
}
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Index })

// Lazy features
const Runs = React.lazy(() => import('./routes/runs'))
const Settings = React.lazy(() => import('./routes/settings'))
const Services = React.lazy(() => import('./routes/services'))
const ServiceWorkspace = React.lazy(() => import('./routes/service-workspace'))
const Agents = React.lazy(() => import('./routes/agents'))
const Login = React.lazy(() => import('./routes/login'))

const runsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/runs', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <Runs />
  </React.Suspense>
)})
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <Settings />
  </React.Suspense>
 )})
const servicesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/services', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <Services />
  </React.Suspense>
)})
const agentsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/agents', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <Agents />
  </React.Suspense>
)})

const serviceWorkspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/services/workspace', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <ServiceWorkspace />
  </React.Suspense>
)})

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => (
  <React.Suspense fallback={<div>Loading…</div>}>
    <Login />
  </React.Suspense>
)})
const routeTree = rootRoute.addChildren([indexRoute, runsRoute, settingsRoute, servicesRoute, serviceWorkspaceRoute, agentsRoute, loginRoute])

const router = createRouter({ routeTree, defaultPreload: 'intent', basepath: '' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')!
createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
