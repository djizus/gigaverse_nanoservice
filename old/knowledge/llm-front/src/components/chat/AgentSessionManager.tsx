import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronRight } from 'lucide-react';
import { NewAgentModal } from './NewAgentModal';
import { AgentDetailsModal } from './AgentDetailsModal';
import { Agent } from '@/types/agent';
import { Session } from '@/types/session';

interface AgentSessionManagerProps {
  agents: Agent[];
  sessions: Session[];
  selectedAgent: Agent | null;
  selectedSession: Session | null;
  onSelectAgent: (agent: Agent | null) => void;
  onSelectSession: (session: Session) => void;
  onCreateAgent: (agentConfig: {
    name: string;
    modelType: string;
    modelId: string;
    contexts: string[];
    contextArgs: Record<string, Record<string, unknown>>;
  }) => void;
  onCreateSession: (name: string, agentId: string) => void;
  onDeleteSession: (id: string) => void;
  onDeleteAgent: (agentId: string) => Promise<void>;
}

export function AgentSessionManager({
  agents,
  sessions,
  selectedAgent,
  selectedSession,
  onSelectAgent,
  onSelectSession,
  onCreateAgent,
  onCreateSession,
  onDeleteSession,
  onDeleteAgent,
}: AgentSessionManagerProps) {
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState<Agent | null>(null);
  const [newSessionName, setNewSessionName] = useState('');

  // Filtrer les sessions par agent
  const getAgentSessions = (agentId: string) => {
    return sessions.filter((session) => session.agentId === agentId);
  };

  const handleCreateSession = (agentId: string) => {
    if (!newSessionName.trim()) return;
    onCreateSession(newSessionName, agentId);
    setNewSessionName('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec bouton de création d'agent */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Agents & Sessions</h2>
        <Button onClick={() => setShowNewAgentModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      {/* Liste des agents et leurs sessions */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {agents.map((agent) => {
            // Skip agents without config
            if (!agent?.config) return null;

            return (
              <Card
                key={agent.id}
                className={`p-4 ${
                  selectedAgent?.id === agent.id ? 'border-primary' : ''
                }`}
              >
                {/* En-tête de l'agent */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onSelectAgent(agent)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {agent.config.name || `Agent ${agent.id.substring(0, 8)}`}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          agent.config.status === 'active'
                            ? 'bg-green-500'
                            : 'bg-gray-500'
                        }`}
                      />
                      <span>{agent.config.status || 'unknown'}</span>
                      <span>•</span>
                      <span>{agent.config.modelType}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAgentDetails(agent);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            'Are you sure you want to delete this agent?',
                          )
                        ) {
                          await onDeleteAgent(agent.id);
                        }
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </div>

                {/* Sessions de l'agent */}
                {selectedAgent?.id === agent.id && (
                  <div className="mt-4 pl-4 border-l space-y-3">
                    {/* Liste des sessions */}
                    {getAgentSessions(agent.id).map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                          selectedSession?.id === session.id
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => onSelectSession(session)}
                      >
                        <div className="flex items-center">
                          <ChevronRight className="h-4 w-4 mr-2" />
                          <span>{session.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}

                    {/* Formulaire de nouvelle session */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="New session..."
                        className="flex-1 px-2 py-1 text-sm rounded border focus:outline-none focus:ring-1"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateSession(agent.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCreateSession(agent.id)}
                        disabled={!newSessionName.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Modals */}
      <NewAgentModal
        isOpen={showNewAgentModal}
        onClose={() => setShowNewAgentModal(false)}
        onCreateAgent={onCreateAgent}
      />

      <AgentDetailsModal
        agent={showAgentDetails}
        isOpen={!!showAgentDetails}
        onClose={() => setShowAgentDetails(null)}
      />
    </div>
  );
}
