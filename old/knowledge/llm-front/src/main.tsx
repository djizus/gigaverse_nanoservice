import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';
import { httpService } from './services/http.service';
import './styles/globals.css';
import './styles/themes.css';

// Initialize auth on app start
function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    console.log('[MAIN] App mount:', { 
      hasToken: !!token,
      timestamp: new Date().toISOString(),
      localStorage: !!localStorage.getItem('auth-storage'),
      currentAuth: useAuthStore.getState().isAuthenticated,
    });
    
    // Ensure token is set in httpService when app starts
    if (token) {
      console.log('[MAIN] Restoring token to httpService on mount');
      httpService.setToken(token);
    }
    
    // Check auth status on mount
    console.log('[MAIN] Calling checkAuth on mount');
    checkAuth();
  }, [checkAuth, token]);

  return <RouterProvider router={router} />;
}

// Biome ignore lint/style/noNonNullAssertion: <explanation>
const rootElement = document.getElementById('root')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
