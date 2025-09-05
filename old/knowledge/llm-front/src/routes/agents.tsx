import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentDetailsModal } from '@/components/chat/AgentDetailsModal';
import { NewAgentModal } from '@/components/chat/NewAgentModal';
import { Eye, MoreVertical, Plus, MessageCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgentsStore } from '@/stores/agents.store';
import { ModelType, ModelId } from '@/types/agent';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AgentsPage() {
  console.log('🚀 [AgentsPage] Component is mounting');

  const agents = useAgentsStore((state) => state.agents);
  const loadAgents = useAgentsStore((state) => state.loadAgents);
  const createAgent = useAgentsStore((state) => state.createAgent);
  const deleteAgent = useAgentsStore((state) => state.deleteAgent);
  const isLoading = useAgentsStore((state) => state.isLoading);
  const error = useAgentsStore((state) => state.error);

  console.log('🔍 [AgentsPage] Direct store access - agents:', agents);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<(typeof agents)[0] | null>(
    null,
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    console.log('🚀 [AgentsPage] Loading agents on mount');
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    console.log('📊 [AgentsPage] Agents state updated:', {
      count: agents.length,
      agents: agents,
      isLoading,
      error,
    });
  }, [agents, isLoading, error]);

  const handleOpenDetails = (agent: (typeof agents)[0]) => {
    setSelectedAgent(agent);
    console.log('handleOpenDetails', agent);

    setIsDetailsModalOpen(true);
  };

  const handleCreateAgent = async (config: {
    name?: string;
    modelType: string;
    modelId: string;
    instructions?: string;
    contexts: string[];
    contextArgs: Record<string, Record<string, unknown>>;
    mcpConfig?: any;
  }) => {
    await createAgent({
      ...config,
      modelType: config.modelType as ModelType,
      modelId: config.modelId as ModelId,
      contextArgs: config.contextArgs as any,
    });
    setIsNewAgentModalOpen(false);
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAgent(agentToDelete);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (
    status: 'active' | 'inactive' | 'busy' | 'paused' | 'deleted',
  ) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'paused':
        return 'bg-orange-500';
      case 'deleted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  console.log('🎨 [AgentsPage] About to render with agents:', agents);
  console.log('🎨 [AgentsPage] Agents length:', agents.length);
  console.log('🎨 [AgentsPage] First agent:', agents[0]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agents</h1>
        <Button
          onClick={() => {
            if (isAuthenticated) {
              setIsNewAgentModalOpen(true);
            } else {
              setShowLoginPrompt(true);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          console.log('🎯 [AgentsPage] Rendering individual agent:', agent);
          return (
            agent && (
              <Card key={agent.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(agent.config?.status || 'inactive')}`}
                      />
                      <CardTitle>
                        {agent.config?.name ||
                          (agent.id
                            ? `Agent ${agent.id.substring(0, 8)}...`
                            : 'Unknown Agent')}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate({ to: `/chat/${agent.id}` })}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Démarrer un chat
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDetails(agent)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setAgentToDelete(agent.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    Contexts:{' '}
                    {agent.config?.contexts?.join(', ') || 'No context'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {agent.config?.modelType || 'Unknown type'}
                      </Badge>
                      <Badge>{agent.config?.modelId || 'Unknown ID'}</Badge>
                    </div>
                    {/* Capabilities - commented out for now */}
                    {agent.config?.stats && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <div>
                          Conversations: {agent.config.stats.totalConversations}
                        </div>
                        <div>
                          Success Rate:{' '}
                          {agent.config.stats.successRate.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: `/chat/${agent.id}` });
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Démarrer un chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          );
        })}
      </div>

      <AgentDetailsModal
        agent={
          (selectedAgent as unknown as import('@/types/agent').Agent) || null
        }
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      <NewAgentModal
        isOpen={isNewAgentModalOpen}
        onClose={() => setIsNewAgentModalOpen(false)}
        onCreateAgent={handleCreateAgent}
      />

      <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connexion requise</AlertDialogTitle>
            <AlertDialogDescription>
              Vous devez être connecté pour créer un nouvel agent. Voulez-vous
              vous connecter maintenant ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLoginPrompt(false);
                navigate({ to: '/login' });
              }}
            >
              Se connecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!agentToDelete} onOpenChange={(open) => !open && setAgentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'agent</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible
              et supprimera également toutes les sessions associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
