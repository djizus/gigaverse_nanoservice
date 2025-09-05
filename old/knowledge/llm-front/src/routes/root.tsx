import { useState } from 'react';
import { Outlet, Link, useNavigate } from '@tanstack/react-router';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PanelLeft,
  MessageSquare,
  BookText,

  FileText,
  Users,
  Layout,
  Server,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { StagingBanner } from '@/components/StagingBanner';

export function Root() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate({ to: '/login' });
  };

  const handleLogin = () => {
    navigate({ to: '/login' });
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar with main navigation */}
        {sidebarVisible && (
          <div className="w-64 border-r bg-card p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">Vibe AI</h1>
              <div className="flex items-center gap-2">
                <ThemeSelector />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarVisible(false)}
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <Separator className="my-2" />

            <nav className="space-y-2 mb-auto">
              <Link
                to="/chat"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat</span>
              </Link>
              <Link
                to="/chat-new"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat Pro</span>
              </Link>
              <Link
                to="/agents"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <Users className="h-5 w-5" />
                <span>Agents</span>
              </Link>
              <Link
                to="/templates"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <Layout className="h-5 w-5" />
                <span>Templates</span>
              </Link>
              <Link
                to="/mcp"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <Server className="h-5 w-5" />
                <span>MCP Servers</span>
              </Link>
              <Link
                to="/knowledge"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <BookText className="h-5 w-5" />
                <span>Knowledge Base</span>
              </Link>
              <Link
                to="/api"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                <FileText className="h-5 w-5" />
                <span>API Explorer</span>
              </Link>
            </nav>

            <Separator className="my-2" />

            <div className="mt-auto space-y-4">
              {/* User info and menu */}
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <p className="font-medium">
                          {user.fullName || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <UserMenu />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Se déconnecter
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-accent/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      Non connecté
                    </p>
                  </div>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleLogin}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Se connecter
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Header with sidebar toggle if needed */}
          {!sidebarVisible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarVisible(true)}
              className="absolute top-2 left-2 z-10"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Page content via Outlet */}
          <Outlet />
        </div>
      </div>
      
      {/* Environment indicator banner */}
      <StagingBanner />
    </ThemeProvider>
  );
}
