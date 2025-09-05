import { create } from 'zustand';
import {
  McpServerTemplate,
  McpServerInfo,
  McpServerConfig,
  McpServerSelection,
  McpExtensionConfig,
} from '@/types/mcp';
import { McpService } from '@/services/mcp.service';

interface McpStore {
  // State
  templates: McpServerTemplate[];
  connectedServers: McpServerInfo[];
  selectedServers: McpServerSelection[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  loadConnectedServers: () => Promise<void>;
  connectServer: (
    templateId: string,
    overrides?: Partial<McpServerConfig>,
  ) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  selectServer: (
    template: McpServerTemplate,
    config?: Partial<McpServerConfig>,
  ) => void;
  unselectServer: (templateId: string) => void;
  updateServerConfig: (
    templateId: string,
    config: Partial<McpServerConfig>,
  ) => void;
  clearSelections: () => void;
  getSelectedMcpConfig: () => McpExtensionConfig;
  toggleServerSelection: (template: McpServerTemplate) => void;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  // Initial state
  templates: [],
  connectedServers: [],
  selectedServers: [],
  isLoading: false,
  error: null,

  // Load all available templates
  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await McpService.getTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false,
      });
    }
  },

  // Load connected servers
  loadConnectedServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const connectedServers = await McpService.getConnectedServers();
      set({ connectedServers, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load connected servers',
        isLoading: false,
      });
    }
  },

  // Connect to a server
  connectServer: async (
    templateId: string,
    overrides?: Partial<McpServerConfig>,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const serverId = `${templateId}-${Date.now()}`;
      await McpService.connectServer({
        templateId,
        overrides: { id: serverId, ...overrides },
      });

      // Refresh connected servers
      await get().loadConnectedServers();
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to connect server',
        isLoading: false,
      });
    }
  },

  // Disconnect from a server
  disconnectServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      await McpService.disconnectServer(serverId);

      // Refresh connected servers
      await get().loadConnectedServers();
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect server',
        isLoading: false,
      });
    }
  },

  // Select a server for agent configuration
  selectServer: (
    template: McpServerTemplate,
    config?: Partial<McpServerConfig>,
  ) => {
    const { selectedServers } = get();
    const existingIndex = selectedServers.findIndex(
      (s) => s.template.id === template.id,
    );

    const newSelection: McpServerSelection = {
      template,
      config: config || {},
      selected: true,
    };

    if (existingIndex >= 0) {
      // Update existing selection
      const newSelectedServers = [...selectedServers];
      newSelectedServers[existingIndex] = newSelection;
      set({ selectedServers: newSelectedServers });
    } else {
      // Add new selection
      set({ selectedServers: [...selectedServers, newSelection] });
    }
  },

  // Unselect a server
  unselectServer: (templateId: string) => {
    const { selectedServers } = get();
    set({
      selectedServers: selectedServers.filter(
        (s) => s.template.id !== templateId,
      ),
    });
  },

  // Update server configuration
  updateServerConfig: (
    templateId: string,
    config: Partial<McpServerConfig>,
  ) => {
    const { selectedServers } = get();
    const updatedServers = selectedServers.map((s) =>
      s.template.id === templateId
        ? { ...s, config: { ...s.config, ...config } }
        : s,
    );
    set({ selectedServers: updatedServers });
  },

  // Clear all selections
  clearSelections: () => {
    set({ selectedServers: [] });
  },

  // Toggle server selection
  toggleServerSelection: (template: McpServerTemplate) => {
    const { selectedServers, selectServer, unselectServer } = get();
    const isSelected = selectedServers.some(
      (s) => s.template.id === template.id,
    );

    if (isSelected) {
      unselectServer(template.id);
    } else {
      selectServer(template);
    }
  },

  // Get MCP configuration for agent creation
  getSelectedMcpConfig: (): McpExtensionConfig => {
    const { selectedServers } = get();

    return {
      enabled: selectedServers.length > 0,
      servers: selectedServers.map((selection) => ({
        id: selection.config.id || `${selection.template.id}-${Date.now()}`,
        name: selection.config.name || selection.template.name,
        description:
          selection.config.description || selection.template.description,
        transport: selection.template.transport,
        enabled: selection.config.enabled !== false,
        timeout: selection.config.timeout || 30000,
        retryCount: selection.config.retryCount || 3,
        retryDelay: selection.config.retryDelay || 5000,
        ...selection.config,
      })),
    };
  },
}));
