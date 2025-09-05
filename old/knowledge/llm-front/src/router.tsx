import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { Root } from './routes/root';
import { ChatPage } from './routes/chat';
import { ChatNewPage } from './routes/chat-new';
import { ApiExplorerPage } from './routes/api-explorer';
import { KnowledgePage } from './routes/knowledge';
import { AgentsPage } from './routes/agents';
import { TemplatesPage } from './routes/templates';
import { McpPage } from './routes/mcp';
import { LandingPage } from './routes/landing';
import LoginPage from './routes/login';
import RegisterPage from './routes/register';
import { useAuthStore } from './stores/auth.store';

// Create a root layout component
const RootLayout = () => {
  const location = useLocation();

  // For auth routes and landing page, don't show the layout
  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/'
  ) {
    return <Outlet />;
  }

  // For other routes, show the full layout
  return <Root />;
};

// Main root route
const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: ChatPage,
});

const chatWithAgentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat/$agentId',
  component: ChatPage,
});

const apiExplorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/api',
  component: ApiExplorerPage,
});

const knowledgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/knowledge',
  component: KnowledgePage,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  component: AgentsPage,
});

const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: TemplatesPage,
});

const mcpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mcp',
  component: McpPage,
});

const chatNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat-new',
  component: ChatNewPage,
});

// Auth routes (attached to main root but will render without layout)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

// Create a protected route wrapper
const protectedRoutes = [
  chatRoute,
  chatWithAgentRoute,
  chatNewRoute,
  apiExplorerRoute,
  knowledgeRoute,
  agentsRoute,
  templatesRoute,
  mcpRoute,
];

// Add beforeLoad to protected routes
protectedRoutes.forEach((route) => {
  const originalBeforeLoad = route.options.beforeLoad;
  route.options.beforeLoad = async (opts: any) => {
    const state = useAuthStore.getState();
    const { isAuthenticated, isLoading, token } = state;
    
    // Get localStorage directly to debug
    const storedAuth = localStorage.getItem('auth-storage');
    let parsedAuth = null;
    try {
      parsedAuth = storedAuth ? JSON.parse(storedAuth) : null;
    } catch (e) {
      console.error('[ROUTER] Failed to parse auth storage:', e);
    }

    console.log('[ROUTER] Route protection check:', {
      path: opts.location.pathname,
      isAuthenticated,
      isLoading,
      hasToken: !!token,
      storedAuth: {
        hasStorage: !!storedAuth,
        storedIsAuthenticated: parsedAuth?.state?.isAuthenticated,
        storedHasToken: !!parsedAuth?.state?.token,
      },
      timestamp: new Date().toISOString(),
    });

    // If we're still loading auth state, wait a bit
    if (isLoading) {
      console.log('[ROUTER] Auth is still loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      const newState = useAuthStore.getState();
      console.log('[ROUTER] After wait:', { isAuthenticated: newState.isAuthenticated });
      if (!newState.isAuthenticated) {
        throw redirect({
          to: '/login',
          search: {
            redirect: opts.location.href,
          },
        });
      }
    } else if (!isAuthenticated) {
      console.log('[ROUTER] Not authenticated, redirecting to login');
      throw redirect({
        to: '/login',
        search: {
          redirect: opts.location.href,
        },
      });
    }

    if (originalBeforeLoad) {
      return originalBeforeLoad(opts);
    }
  };
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  ...protectedRoutes,
  loginRoute,
  registerRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register your router for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
