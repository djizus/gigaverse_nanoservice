import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  McpServerConfig,
  McpServerInfo,
  McpServerStatus,
  McpServerTemplate,
  McpTransport,
  McpEvent,
  McpEventType,
  McpServerCapabilities,
} from '../types/mcp';
// Import types only (these are removed during compilation)
import type { StdioClientTransport as StdioClientTransportType } from '@modelcontextprotocol/sdk/client/stdio';
import type { Client as ClientType } from '@modelcontextprotocol/sdk/client/index';

// Runtime imports will be loaded dynamically
let StdioClientTransport: typeof StdioClientTransportType;
let Client: typeof ClientType;
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

@Injectable()
export class McpService extends EventEmitter implements OnModuleDestroy {
  private mcpModulesLoaded = false;
  private readonly logger = new Logger(McpService.name);
  private readonly clients: Map<string, InstanceType<typeof ClientType>> =
    new Map();
  private readonly serverInfo: Map<string, McpServerInfo> = new Map();
  private readonly processes: Map<string, ChildProcess> = new Map();
  private readonly templates: Map<string, McpServerTemplate> = new Map();

  constructor(private configService: ConfigService) {
    super();
    this.initializeTemplates();
  }

  private async loadMcpModules() {
    if (this.mcpModulesLoaded) return;

    try {
      // Dynamic imports for ESM compatibility
      const [stdioModule, clientModule] = await Promise.all([
        import('@modelcontextprotocol/sdk/client/stdio.js'),
        import('@modelcontextprotocol/sdk/client/index.js'),
      ]);

      StdioClientTransport = stdioModule.StdioClientTransport;
      Client = clientModule.Client;
      this.mcpModulesLoaded = true;
    } catch (error) {
      this.logger.error('Failed to load MCP modules', error);
      throw new Error('Failed to load MCP SDK modules');
    }
  }

  onModuleDestroy() {
    this.disconnectAllServers();
  }

  /**
   * Initialize pre-configured MCP server templates
   */
  private initializeTemplates() {
    try {
      // Get NOTION_API_KEY from environment or config
      const notionApiKey =
        this.configService?.get<string>('NOTION_API_KEY') ||
        process.env.NOTION_API_KEY;
      this.logger.log(`[MCP INIT] NOTION_API_KEY available: ${!!notionApiKey}`);
      if (notionApiKey) {
        this.logger.log(
          `[MCP INIT] NOTION_API_KEY starts with: ${notionApiKey.substring(0, 10)}...`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `[MCP INIT] Failed to get NOTION_API_KEY: ${error.message}`,
      );
    }

    // Notion MCP Server Template (Official Notion MCP Server)
    this.templates.set('notion', {
      id: 'notion',
      name: 'Notion Official MCP Server',
      description:
        'Connect to Notion workspace using official Notion MCP server',
      category: 'productivity',
      icon: '📝',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@notionhq/notion-mcp-server'],
        env: {
          OPENAPI_MCP_HEADERS:
            '{"Authorization": "Bearer ${NOTION_API_KEY}", "Notion-Version": "2022-06-28"}',
        },
      },
      requiredEnvVars: ['NOTION_API_KEY'],
      setupInstructions:
        'Set NOTION_API_KEY environment variable with your Notion integration token (starts with ntn_). Uses official @notionhq/notion-mcp-server package.',
    });

    // Linear MCP Server Template (Official Linear MCP Server via Remote)
    // TODO: Improve authentication when Linear supports direct OAuth token passing
    // Currently uses mcp-remote with dynamic client registration OAuth flow
    // This opens browser for auth - not ideal for deployed applications
    // Linear is exploring allowing direct OAuth access tokens/API keys in future
    this.templates.set('linear', {
      id: 'linear',
      name: 'Linear Official MCP Server',
      description:
        'Connect to Linear for issue tracking and project management using official Linear MCP server with OAuth authentication via mcp-remote',
      category: 'productivity',
      icon: '📋',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://mcp.linear.app/sse'],
      },
      requiredEnvVars: [],
      setupInstructions:
        'Uses official Linear MCP server with OAuth dynamic client registration via mcp-remote. Authentication opens browser window (not suitable for deployed apps). Tokens expire regularly. This is current limitation - Linear is exploring direct OAuth token support.',
    });

    // Example local MCP server template
    this.templates.set('example-local', {
      id: 'example-local',
      name: 'Example Local Server',
      description: 'A simple local MCP server for testing and development',
      category: 'development',
      icon: '🔧',
      transport: {
        type: 'stdio',
        command: 'node',
        args: ['./your-mcp-server.mjs.js'],
      },
      requiredEnvVars: [],
      setupInstructions: 'Create your own MCP server script file',
    });

    // HTTP MCP server template
    this.templates.set('http-server', {
      id: 'http-server',
      name: 'HTTP MCP Server',
      description: 'Connect to an MCP server via HTTP',
      category: 'development',
      icon: '🌐',
      transport: {
        type: 'http',
        url: 'http://localhost:4010',
      },
      requiredEnvVars: [],
      setupInstructions:
        'Configure the URL to point to your HTTP MCP server endpoint',
    });

    this.logger.log(`Initialized ${this.templates.size} MCP server templates`);
  }

  /**
   * Get all available MCP server templates
   */
  getTemplates(): McpServerTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific MCP server template
   */
  getTemplate(templateId: string): McpServerTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Create MCP server config from template
   */
  createServerConfigFromTemplate(
    templateId: string,
    serverId: string,
    overrides?: Partial<McpServerConfig>,
  ): McpServerConfig | undefined {
    const template = this.templates.get(templateId);
    if (!template) {
      return undefined;
    }

    // Replace environment variables in transport config
    const transport = this.replaceEnvVarsInTransport(template.transport);

    return {
      id: serverId,
      name: template.name,
      description: template.description,
      transport,
      enabled: true,
      timeout: 30000,
      retryCount: 3,
      retryDelay: 5000,
      ...template.defaultConfig,
      ...overrides,
    };
  }

  /**
   * Replace environment variables in transport configuration
   */
  private replaceEnvVarsInTransport(transport: McpTransport): McpTransport {
    const result = JSON.parse(JSON.stringify(transport));

    if (transport.type === 'stdio' && transport.env) {
      for (const [key, value] of Object.entries(transport.env)) {
        if (typeof value === 'string') {
          result.env[key] = this.replaceEnvVars(value);
        }
      }
    }

    if (transport.type === 'http' && transport.headers) {
      for (const [key, value] of Object.entries(transport.headers)) {
        if (typeof value === 'string') {
          result.headers[key] = this.replaceEnvVars(value);
        }
      }
    }

    return result;
  }

  /**
   * Replace environment variables in a string (supports ${VAR_NAME} syntax)
   */
  private replaceEnvVars(str: string): string {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      try {
        const value =
          this.configService?.get<string>(varName) || process.env[varName];
        if (!value) {
          this.logger.warn(`Environment variable ${varName} not found`);
          return match;
        }
        return value;
      } catch (error) {
        this.logger.warn(
          `Failed to get environment variable ${varName}: ${error.message}`,
        );
        return match;
      }
    });
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(config: McpServerConfig): Promise<boolean> {
    try {
      // Ensure MCP modules are loaded
      await this.loadMcpModules();
      this.updateServerStatus(config.id, 'connecting');

      if (config.transport.type === 'stdio') {
        return await this.connectStdioServer(config);
      } else if (config.transport.type === 'http') {
        return await this.connectHttpServer(config);
      } else {
        throw new Error(
          `Transport type ${config.transport.type} not yet implemented`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to connect to MCP server ${config.id}:`, error);
      this.updateServerStatus(config.id, 'error', error.message);
      this.emitEvent('server_error', config.id, { error: error.message });
      return false;
    }
  }

  /**
   * Connect to stdio-based MCP server
   */
  private async connectStdioServer(config: McpServerConfig): Promise<boolean> {
    const transport = config.transport as any; // stdio transport

    console.log('\n🔍 [MCP STDIO DEBUG] Starting connection for:', config.name);
    console.log('📋 [MCP STDIO DEBUG] Raw env:', transport.env);

    // Replace environment variables in transport.env
    const processedEnv = { ...transport.env };
    for (const [key, value] of Object.entries(processedEnv)) {
      if (typeof value === 'string') {
        console.log(`🔄 [MCP STDIO DEBUG] Processing ${key}: ${value}`);
        processedEnv[key] = this.replaceEnvVars(value);
        console.log(
          `✅ [MCP STDIO DEBUG] Processed ${key}: ${processedEnv[key].substring(0, 100)}...`,
        );
      }
    }

    // Debug logging for authentication headers
    if (processedEnv.OPENAPI_MCP_HEADERS) {
      this.logger.log(
        `[MCP DEBUG] OPENAPI_MCP_HEADERS: ${processedEnv.OPENAPI_MCP_HEADERS}`,
      );
      try {
        // Validate JSON format
        const parsedHeaders = JSON.parse(processedEnv.OPENAPI_MCP_HEADERS);
        this.logger.log('[MCP DEBUG] Parsed headers:', parsedHeaders);
        this.logger.log(
          '[MCP DEBUG] Authorization header:',
          parsedHeaders.Authorization,
        );
        this.logger.log('[MCP DEBUG] OPENAPI_MCP_HEADERS is valid JSON');
      } catch (e) {
        this.logger.error(
          '[MCP DEBUG] OPENAPI_MCP_HEADERS is not valid JSON:',
          e.message,
        );
      }
    }

    // Log full environment for debugging
    this.logger.log('[MCP DEBUG] Command:', transport.command);
    this.logger.log('[MCP DEBUG] Args:', transport.args);
    this.logger.log('[MCP DEBUG] Env keys:', Object.keys(processedEnv));

    // Create client transport with proper environment
    // StdioClientTransport will spawn its own process
    const clientTransport = new StdioClientTransport({
      command: transport.command,
      args: transport.args || [],
      env: { ...process.env, ...processedEnv }, // Must include process.env for PATH and other system vars
    });

    // Create and connect client
    const client = new Client(
      {
        name: 'daydreams-llm-api',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    await client.connect(clientTransport);
    this.clients.set(config.id, client);

    // Get server capabilities
    const capabilities = await this.getServerCapabilities(config.id);

    this.updateServerStatus(config.id, 'connected');
    this.serverInfo.set(config.id, {
      id: config.id,
      status: 'connected',
      lastConnected: new Date(),
      capabilities: {
        tools: !!capabilities?.tools?.length,
        resources: !!capabilities?.resources?.length,
        prompts: !!capabilities?.prompts?.length,
      },
      metadata: capabilities as Record<string, unknown>,
    });

    this.emitEvent('server_connected', config.id, {
      capabilities: capabilities as Record<string, unknown>,
    });
    this.logger.log(`Connected to MCP server: ${config.name} (${config.id})`);

    // Store the process from the transport for later management
    const mcpProcess = (clientTransport as any)._process;
    if (mcpProcess) {
      this.processes.set(config.id, mcpProcess);

      // Handle process exit
      mcpProcess.on('exit', (code: number | null) => {
        this.logger.warn(
          `MCP server process ${config.id} exited with code ${code}`,
        );
        this.disconnectServer(config.id);
      });
    }

    return true;
  }

  /**
   * Connect to HTTP-based MCP server (placeholder)
   */
  private async connectHttpServer(_config: McpServerConfig): Promise<boolean> {
    // TODO: Implement HTTP transport
    this.logger.warn('HTTP transport not yet implemented');
    return false;
  }

  /**
   * Get server capabilities
   */
  async getServerCapabilities(
    serverId: string,
  ): Promise<McpServerCapabilities | undefined> {
    console.log('[DEBUG] getServerCapabilities called for server:', serverId);

    const client = this.clients.get(serverId);
    if (!client) {
      console.log(
        '[DEBUG] getServerCapabilities - No client found for server:',
        serverId,
      );
      console.log(
        '[DEBUG] getServerCapabilities - Available clients:',
        Array.from(this.clients.keys()),
      );
      return undefined;
    }

    try {
      console.log(
        '[DEBUG] getServerCapabilities - Calling client.listTools, listResources, listPrompts',
      );
      const [tools, resources, prompts] = await Promise.all([
        client.listTools().catch(e => {
          console.log('[DEBUG] listTools error:', e.message);
          return { tools: [] };
        }),
        client.listResources().catch(e => {
          console.log('[DEBUG] listResources error:', e.message);
          return { resources: [] };
        }),
        client.listPrompts().catch(e => {
          console.log('[DEBUG] listPrompts error:', e.message);
          return { prompts: [] };
        }),
      ]);

      console.log('[DEBUG] getServerCapabilities - Results:');
      console.log('  - tools:', tools.tools?.length || 0, 'items');
      console.log('  - resources:', resources.resources?.length || 0, 'items');
      console.log('  - prompts:', prompts.prompts?.length || 0, 'items');

      const capabilities = {
        tools: tools.tools || [],
        resources: resources.resources || [],
        prompts: prompts.prompts || [],
      };

      console.log(
        '[DEBUG] getServerCapabilities - Final capabilities:',
        capabilities,
      );
      return capabilities;
    } catch (error) {
      this.logger.error(
        `Failed to get capabilities for server ${serverId}:`,
        error,
      );
      console.log('[DEBUG] getServerCapabilities - Exception:', error);
      return undefined;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    const childProcess = this.processes.get(serverId);

    if (client) {
      try {
        await client.close();
      } catch (error) {
        this.logger.error(`Error closing MCP client ${serverId}:`, error);
      }
      this.clients.delete(serverId);
    }

    if (childProcess && !childProcess.killed) {
      childProcess.kill();
      this.processes.delete(serverId);
    }

    this.updateServerStatus(serverId, 'disconnected');
    this.emitEvent('server_disconnected', serverId);
    this.logger.log(`Disconnected from MCP server: ${serverId}`);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAllServers(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map(id => this.disconnectServer(id)));
  }

  /**
   * Get MCP client for a server
   */
  getClient(serverId: string): InstanceType<typeof ClientType> | undefined {
    return this.clients.get(serverId);
  }

  /**
   * Get server info
   */
  getServerInfo(serverId: string): McpServerInfo | undefined {
    return this.serverInfo.get(serverId);
  }

  /**
   * Get all connected servers
   */
  getConnectedServers(): McpServerInfo[] {
    return Array.from(this.serverInfo.values());
  }

  /**
   * Update server status
   */
  private updateServerStatus(
    serverId: string,
    status: McpServerStatus,
    error?: string,
  ): void {
    const info = this.serverInfo.get(serverId) || {
      id: serverId,
      status: 'disconnected',
    };

    info.status = status;
    if (error) {
      info.lastError = error;
    }

    this.serverInfo.set(serverId, info);
  }

  /**
   * Emit MCP event
   */
  private emitEvent(
    type: McpEventType,
    serverId: string,
    data?: Record<string, unknown>,
  ): void {
    const event: McpEvent = {
      type,
      serverId,
      timestamp: new Date(),
      data,
    };

    this.emit('mcp_event', event);
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverId: string,
    toolName: string,
    arguments_: Record<string, unknown>,
  ): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} not connected`);
    }

    // Validate toolName is provided and not empty
    if (
      !toolName ||
      typeof toolName !== 'string' ||
      toolName.trim().length === 0
    ) {
      throw new Error('Tool name is required and must be a non-empty string');
    }

    try {
      this.logger.log(
        `[MCP] Calling tool ${toolName} on server ${serverId} with args:`,
        arguments_,
      );

      const result = await client.callTool({
        name: toolName.trim(),
        arguments: arguments_ || {},
      });

      this.emitEvent('tool_called', serverId, { toolName, arguments_, result });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to call tool ${toolName} on server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} not connected`);
    }

    try {
      const result = await client.readResource({ uri });
      this.emitEvent('resource_accessed', serverId, { uri, result });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to read resource ${uri} from server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    arguments_?: Record<string, unknown>,
  ): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} not connected`);
    }

    try {
      const result = await client.getPrompt({
        name: promptName,
        arguments: arguments_ as Record<string, string>,
      });

      this.emitEvent('prompt_used', serverId, {
        promptName,
        arguments_,
        result,
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get prompt ${promptName} from server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get available tools from MCP servers
   */
  async getAvailableTools(
    serverIds?: string[],
  ): Promise<{ serverId: string; tools: any[] }[]> {
    const targetServerIds = serverIds || Array.from(this.clients.keys());
    const results = [];

    for (const serverId of targetServerIds) {
      const client = this.clients.get(serverId);
      if (!client) {
        continue;
      }

      try {
        const response = await client.listTools();
        results.push({
          serverId,
          tools: response.tools || [],
        });
      } catch (error) {
        this.logger.error(
          `Failed to get tools from server ${serverId}:`,
          error,
        );
        results.push({
          serverId,
          tools: [],
        });
      }
    }

    return results;
  }

  /**
   * Get status information for all servers
   */
  getServerStatuses(): Record<
    string,
    { status: McpServerStatus; info?: McpServerInfo }
  > {
    const statuses: Record<
      string,
      { status: McpServerStatus; info?: McpServerInfo }
    > = {};

    for (const [serverId, info] of this.serverInfo.entries()) {
      statuses[serverId] = {
        status: info.status,
        info,
      };
    }

    return statuses;
  }
}
