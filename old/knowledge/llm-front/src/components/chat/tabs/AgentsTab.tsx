import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgentDetailsModal } from '../AgentDetailsModal';
import { NewAgentModal } from '../NewAgentModal';
import { Agent } from '@/types/agent';

interface AgentsTabProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export function AgentsTab({
  agents,
  selectedAgent,
  onSelectAgent,
}: AgentsTabProps) {
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [selectedAgentForDetails, setSelectedAgentForDetails] =
    useState<Agent | null>(null);

  const handleCreateAgent = () => {
    // Handle agent creation
    setShowNewAgentModal(false);
  };

  const handleShowDetails = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Opening details for agent:', agent);
    setSelectedAgentForDetails(agent);
  };

  const handleCloseDetails = () => {
    console.log('Closing details modal');
    setSelectedAgentForDetails(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agents</h2>
        <Button onClick={() => setShowNewAgentModal(true)}>
          Create New Agent
        </Button>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => {
          if (!agent?.config) {
            console.warn('Agent without config found:', agent);
            return null;
          }

          return (
            <div
              key={agent.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedAgent?.id === agent.id ? 'bg-muted' : ''
              }`}
              onClick={() => onSelectAgent(agent)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {agent.config.modelType} - {agent.config.modelId}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {agent.id}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        agent.config.status === 'active'
                          ? 'bg-green-500'
                          : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm">
                      {agent.config.status || 'unknown'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleShowDetails(agent, e)}
                >
                  Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <NewAgentModal
        isOpen={showNewAgentModal}
        onClose={() => setShowNewAgentModal(false)}
        onCreateAgent={handleCreateAgent}
      />

      {selectedAgentForDetails && (
        <AgentDetailsModal
          agent={selectedAgentForDetails}
          isOpen={true}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
