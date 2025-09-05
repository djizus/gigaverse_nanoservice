import {
  McpServerTemplate,
  McpServerInfo,
  McpServerConfig,
  McpServerCapabilities,
} from '@/types/mcp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class McpService {
  /**
   * Get all available MCP server templates
   */
  static async getTemplates(): Promise<McpServerTemplate[]> {
    const response = await fetch(`${API_URL}/mcp/templates`);
    if (!response.ok) {
      throw new Error('Failed to fetch MCP templates');
    }
    return response.json();
  }

  /**
   * Get a specific MCP server template
   */
  static async getTemplate(templateId: string): Promise<McpServerTemplate> {
    const response = await fetch(`${API_URL}/mcp/templates/${templateId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch template ${templateId}`);
    }
    return response.json();
  }

  /**
   * Create server config from template
   */
  static async createServerConfigFromTemplate(
    templateId: string,
    serverId: string,
    overrides?: Partial<McpServerConfig>
  ): Promise<McpServerConfig> {
    const response = await fetch(`${API_URL}/mcp/templates/${templateId}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverId,
        overrides,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create server config');
    }

    return response.json();
  }

  /**
   * Connect to an MCP server
   */
  static async connectServer(config: {
    templateId?: string;
    serverConfig?: McpServerConfig;
    overrides?: Partial<McpServerConfig>;
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/mcp/servers/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Special handling for Linear MCP OAuth issues
      if (config.templateId === 'linear' && (
        errorText.includes('Request timed out') || 
        errorText.includes('authentication failed') ||
        response.status === 503
      )) {
        throw new Error(
          'Linear MCP requiert une authentification OAuth par navigateur, ce qui ne fonctionne pas dans cet environnement hébergé. ' +
          'Solutions possibles: (1) Utiliser ngrok pour exposer le port d\'auth, (2) Attendre que Linear supporte les tokens directs, ' +
          'ou (3) Utiliser Linear en local seulement.'
        );
      }
      
      throw new Error(errorText || 'Failed to connect to server');
    }

    return response.json();
  }

  /**
   * Get all connected servers
   */
  static async getConnectedServers(): Promise<McpServerInfo[]> {
    const response = await fetch(`${API_URL}/mcp/servers`);
    if (!response.ok) {
      throw new Error('Failed to fetch connected servers');
    }
    return response.json();
  }

  /**
   * Get specific server info
   */
  static async getServerInfo(serverId: string): Promise<McpServerInfo> {
    const response = await fetch(`${API_URL}/mcp/servers/${serverId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch server ${serverId}`);
    }
    return response.json();
  }

  /**
   * Get server capabilities
   */
  static async getServerCapabilities(serverId: string): Promise<McpServerCapabilities> {
    const response = await fetch(`${API_URL}/mcp/servers/${serverId}/capabilities`);
    if (!response.ok) {
      throw new Error(`Failed to fetch capabilities for server ${serverId}`);
    }
    return response.json();
  }

  /**
   * Disconnect from a server
   */
  static async disconnectServer(serverId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/mcp/servers/${serverId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect from server ${serverId}`);
    }

    return response.json();
  }

  /**
   * Call a tool on an MCP server
   */
  static async callTool(
    serverId: string,
    toolName: string,
    arguments_: Record<string, unknown>
  ): Promise<any> {
    const response = await fetch(`${API_URL}/mcp/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverId,
        toolName,
        arguments: arguments_,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to call tool ${toolName}`);
    }

    return response.json();
  }

  /**
   * Read a resource from an MCP server
   */
  static async readResource(serverId: string, uri: string): Promise<any> {
    const response = await fetch(`${API_URL}/mcp/resources/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverId,
        uri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to read resource ${uri}`);
    }

    return response.json();
  }

  /**
   * Get a prompt from an MCP server
   */
  static async getPrompt(
    serverId: string,
    promptName: string,
    arguments_?: Record<string, unknown>
  ): Promise<any> {
    const response = await fetch(`${API_URL}/mcp/prompts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverId,
        promptName,
        arguments: arguments_,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get prompt ${promptName}`);
    }

    return response.json();
  }
} 