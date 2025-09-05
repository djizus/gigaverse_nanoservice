import React from 'react';
import { Agent } from '../../types/session';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelect: (agentId: string) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgentId,
  onSelect,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select an Agent
      </label>
      <select
        value={selectedAgentId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Choose an agent...</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.config?.name || agent.id}
          </option>
        ))}
      </select>
    </div>
  );
};
