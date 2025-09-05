import { create } from 'zustand';
import { StateCreator } from 'zustand';
import {
  Agent,
  AgentConfig,
  ModelType,
  ModelId,
  AgentContextArgs,
} from '@/types/agent';
import { httpService } from '@/services/http.service';

interface AgentsState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  loadAgents: () => Promise<void>;
  setSelectedAgent: (agent: Agent | null) => void;
  createAgent: (config: {
    name?: string;
    modelType: ModelType;
    modelId: ModelId;
    instructions?: string;
    contexts: string[];
    contextArgs: Record<string, AgentContextArgs>;
    mcpConfig?: any;
  }) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
}

const createAgentsStore: StateCreator<AgentsState> = (set) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,

  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await httpService.get<{ agents: Agent[] }>(
        '/daydreams/agents',
      );
      console.log('📦 [AgentsStore] Raw response from API:', data);
      console.log('🔍 [AgentsStore] Agents data:', {
        hasAgents: !!data.agents,
        agentsCount: data.agents?.length || 0,
        firstAgent: data.agents?.[0],
      });
      console.log(
        '🔍 [AgentsStore] First agent structure:',
        JSON.stringify(data.agents?.[0], null, 2),
      );

      // Transform the agents to match the expected structure
      const transformedAgents: Agent[] = (data.agents || []).map((agent) => {
        // If agent already has config structure, use it
        if (agent.config) {
          return agent;
        }

        // Otherwise, wrap all properties in config
        const { id, ...configProps } = agent as any;
        return {
          id,
          config: {
            id,
            ...configProps,
          } as AgentConfig,
        };
      });

      console.log('✨ [AgentsStore] Transformed agents:', transformedAgents);
      set({ agents: transformedAgents, isLoading: false });
    } catch (error) {
      console.error('Error loading agents:', error);
      set({ error: 'Failed to load agents', isLoading: false });
    }
  },

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  createAgent: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const response = await httpService.post<any>('/daydreams/agents', config);
      console.log('🆕 [AgentsStore] Create agent response:', response);

      // The API might return a success response with agentId
      if (response.success && response.agentId) {
        // Reload all agents to get the complete data
        console.log('♻️ [AgentsStore] Reloading agents after creation');
        const { loadAgents } = useAgentsStore.getState();
        await loadAgents();
      } else {
        // If the response is already an agent object, add it directly
        set((state) => ({
          agents: [...state.agents, response],
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      set({ error: 'Failed to create agent', isLoading: false });
    }
  },

  deleteAgent: async (agentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await httpService.delete(`/daydreams/agents/${agentId}`);
      console.log('🗑️ [AgentsStore] Delete agent response:', response);
      
      // Remove the agent from the local state
      set((state) => ({
        agents: state.agents.filter((agent) => agent.id !== agentId),
        selectedAgent: state.selectedAgent?.id === agentId ? null : state.selectedAgent,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error deleting agent:', error);
      set({ error: 'Failed to delete agent', isLoading: false });
      throw error;
    }
  },
});

export const useAgentsStore = create<AgentsState>()(createAgentsStore);
