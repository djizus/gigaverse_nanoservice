import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Code,
  Shield,
  Zap,
  Users,
  BookText,
  Server,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Globe,
  Terminal,
  Layers,
  GitBranch,
  Database,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate({ to: '/chat' as any });
    } else {
      navigate({ to: '/register' });
    }
  };

  const handleLogin = () => {
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              Multi-Agent AI Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Create and deploy intelligent AI agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A complete platform to build, manage, and orchestrate AI agents
              with multi-LLM support, advanced state management, and powerful
              integrations.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={handleGetStarted}>
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleLogin}>
                Log in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Key Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build sophisticated AI agents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Multi-Provider LLM */}
            <Card>
              <CardHeader>
                <Brain className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Multi-Provider LLM</CardTitle>
                <CardDescription>
                  Native support for Claude (Anthropic) and OpenAI with an
                  extensible architecture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Claude 3.5 Sonnet and GPT-4</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Hot-swap models on the fly</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Automatic cost optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* React-like Architecture */}
            <Card>
              <CardHeader>
                <Code className="h-10 w-10 text-primary mb-4" />
                <CardTitle>React-like Architecture</CardTitle>
                <CardDescription>
                  Agent life-cycle management with familiar hooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>onStep, onRun, shouldContinue</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Context composition</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Built-in error handling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Built-in Security */}
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Built-in Security</CardTitle>
                <CardDescription>
                  Robust authentication and authorization system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>JWT authentication</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Admin approval workflow</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Full audit trail</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Persistent Memory */}
            <Card>
              <CardHeader>
                <Database className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Persistent Memory</CardTitle>
                <CardDescription>
                  Multiple backends for data persistence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Supabase (PostgreSQL)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>ChromaDB for vector search</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>MongoDB and in-memory cache</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Model Context Protocol */}
            <Card>
              <CardHeader>
                <Server className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Model Context Protocol</CardTitle>
                <CardDescription>
                  MCP integration to extend capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Stdio, HTTP, and WebSocket support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Notion and Linear integrations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Custom MCP servers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Typed Actions */}
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Typed Actions</CardTitle>
                <CardDescription>
                  Action framework with Zod validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Automatic schema validation</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Full type safety</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Composable actions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technical Stack */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Modern tech stack
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with the best technologies for optimal performance and
              scalability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Backend */}
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Terminal className="h-5 w-5 mr-2" />
                Backend
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">NestJS 11</Badge>
                  <span className="text-sm text-muted-foreground">
                    Enterprise-grade framework
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">TypeScript 5.7+</Badge>
                  <span className="text-sm text-muted-foreground">
                    Full type safety
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">@daydreamsai/core</Badge>
                  <span className="text-sm text-muted-foreground">
                    Agent orchestration
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">WebSockets</Badge>
                  <span className="text-sm text-muted-foreground">
                    Real-time communication
                  </span>
                </div>
              </div>
            </div>

            {/* Frontend */}
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Frontend
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">React 18</Badge>
                  <span className="text-sm text-muted-foreground">
                    Modern reactive UI
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Vite</Badge>
                  <span className="text-sm text-muted-foreground">
                    Blazing-fast builds
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">TanStack Router</Badge>
                  <span className="text-sm text-muted-foreground">
                    Type-safe routing
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Shadcn/ui</Badge>
                  <span className="text-sm text-muted-foreground">
                    Elegant components
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful integrations
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect your agents to your favourite tools
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookText className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Notion</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Official API
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Linear</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Built-in OAuth
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Discord</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Integrated bot
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Custom MCP</h4>
                <p className="text-sm text-muted-foreground mt-1">Extensible</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to build your AI agents?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join the platform and start creating intelligent agents today
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={handleGetStarted}>
              Start now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10"
            >
              Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">Vibe AI</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure platform with Supabase authentication</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
