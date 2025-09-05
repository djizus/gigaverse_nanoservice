import { action } from '@daydreamsai/core';
import { createSchema, z } from '../utils/schema-helpers';
import { McpService } from '../services/mcp.service';
import type { ChatMemory } from '../context/chat.context';

/**
 * Utility functions for MCP actions
 */
export class McpActionUtils {
  /**
   * Extract serverId from various argument formats with smart auto-fallback
   */
  static extractServerId(args: any, mcpService: McpService): string | null {
    let serverId: string | undefined;

    if (typeof args === 'string') {
      serverId = args;
    } else if (args && typeof args === 'object') {
      serverId = args.serverId || args.server_id || args.id || args.serverid;

      // Check nested structures
      if (!serverId && args.arguments) {
        serverId =
          args.arguments.serverId ||
          args.arguments.server_id ||
          args.arguments.id ||
          args.arguments.serverid;
      }
    }

    // Smart auto-fallback: prefer connected servers over disconnected ones
    if (!serverId) {
      const availableServers = mcpService.getConnectedServers();
      if (availableServers.length > 0) {
        // First try to find a connected server
        const connectedServers = availableServers.filter(
          s => s.status === 'connected',
        );
        if (connectedServers.length > 0) {
          serverId = connectedServers[0].id;
          console.log(
            `[DEBUG] SMART AUTO-FALLBACK: Using first connected server: ${serverId}`,
          );
        } else {
          // Fallback to any available server
          serverId = availableServers[0].id;
          console.log(
            `[DEBUG] AUTO-FALLBACK: Using first available server: ${serverId} (status: ${availableServers[0].status})`,
          );
        }
      }
    }

    // Validate that the selected server is actually connected
    if (serverId) {
      const availableServers = mcpService.getConnectedServers();
      const selectedServer = availableServers.find(s => s.id === serverId);

      if (!selectedServer) {
        console.warn(
          `[WARN] Selected server ${serverId} not found in available servers`,
        );
        return null;
      }

      if (selectedServer.status !== 'connected') {
        console.warn(
          `[WARN] Selected server ${serverId} is ${selectedServer.status}, looking for alternative`,
        );

        // Try to find a connected alternative
        const connectedServers = availableServers.filter(
          s => s.status === 'connected',
        );
        if (connectedServers.length > 0) {
          const newServerId = connectedServers[0].id;
          console.log(
            `[DEBUG] ALTERNATIVE: Using connected server ${newServerId} instead of ${serverId}`,
          );
          return newServerId;
        }

        console.warn(
          `[WARN] No connected servers available, will attempt to use ${serverId} anyway`,
        );
      }
    }

    return serverId || null;
  }

  /**
   * Validate server exists and is connected
   */
  static async validateServer(
    serverId: string,
    mcpService: McpService,
  ): Promise<boolean> {
    const connectedServers = mcpService.getConnectedServers();
    const serverExists = connectedServers.find(s => s.id === serverId);

    if (!serverExists) {
      console.error(`[ERROR] Server ${serverId} not found`);
      return false;
    }

    if (serverExists.status !== 'connected') {
      console.warn(
        `[WARN] Server ${serverId} status is ${serverExists.status}`,
      );
    }

    return true;
  }
}

/**
 * Core MCP actions factory
 */
/**
 * Core MCP actions - Essential actions only
 */
export function createCoreMcpActions(mcpService: McpService) {
  return [
    // List servers
    action({
      name: 'mcp.listServers',
      description: 'List all MCP servers and get usage instructions',
      schema: createSchema({}),
      async handler(args: any, ctx: any, agent: any) {
        const servers = mcpService.getConnectedServers().map(server => ({
          id: server.id,
          name: server.id,
          connected: server.status === 'connected',
          status: server.status,
          capabilities: server.capabilities,
          lastConnected: server.lastConnected,
        }));

        return {
          servers,
          count: servers.length,
          connected: servers.filter(s => s.connected).length,
          message:
            servers.length > 0
              ? `Found ${servers.length} server(s), ${servers.filter(s => s.connected).length} connected.`
              : 'No MCP servers connected.',
        };
      },
    }),

    // List tools
    action({
      name: 'mcp.listTools',
      description: 'List available tools from an MCP server',
      schema: createSchema({
        serverId: z
          .string()
          .optional()
          .describe('ID of the MCP server to query'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        console.log(
          '[DEBUG] mcp.listTools called with args:',
          JSON.stringify(args),
        );

        const serverId = args?.serverId;
        const finalServerId =
          serverId || McpActionUtils.extractServerId(args || {}, mcpService);

        console.log('[DEBUG] listTools - finalServerId:', finalServerId);
        console.log(
          '[DEBUG] listTools - Available servers:',
          mcpService
            .getConnectedServers()
            .map(s => ({ id: s.id, status: s.status })),
        );

        if (!finalServerId) {
          return {
            tools: [],
            message:
              'No MCP servers connected. Please connect to a server first.',
          };
        }

        const capabilities =
          await mcpService.getServerCapabilities(finalServerId);
        if (!capabilities) {
          throw new Error(`Server ${finalServerId} not found or not connected`);
        }

        console.log(
          `[DEBUG] listTools - Found ${capabilities.tools?.length || 0} tools for server ${finalServerId}`,
        );
        return {
          tools: capabilities.tools || [],
          serverId: finalServerId,
          message: `Found ${capabilities.tools?.length || 0} tools from server ${finalServerId}`,
        };
      },
    }),

    // Call tool
    action({
      name: 'mcp.callTool',
      description: 'Call a tool on an MCP server',
      schema: createSchema({
        serverId: z
          .string()
          .optional()
          .describe('ID of the MCP server to query'),
        name: z.string().describe('Name of the tool to call'),
        arguments: z
          .record(z.any())
          .optional()
          .describe('Arguments for the tool'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        console.log('[DEBUG] mcp-core-actions.callTool handler called with:');
        console.log('  - args:', JSON.stringify(args, null, 2));
        console.log('  - args type:', typeof args);
        console.log('  - ctx:', ctx ? 'context present' : 'no context');
        console.log('  - agent:', agent ? 'agent present' : 'no agent');

        // Extract arguments with more robust parsing
        let serverId: string | undefined;
        let name: string | undefined;
        let arguments_: Record<string, any> = {};

        // Handle different argument formats
        if (typeof args === 'string') {
          // If args is a string, try to parse it as tool name
          name = args;
        } else if (args && typeof args === 'object') {
          serverId = args.serverId || args.server_id;
          name = args.name || args.toolName || args.tool_name || args.tool;
          arguments_ = args.arguments || args.args || args.parameters || {};

          // If name is not found at top level, check if args itself contains tool info
          if (!name && Object.keys(args).length === 1) {
            const key = Object.keys(args)[0];
            if (typeof args[key] === 'object' && args[key].name) {
              name = args[key].name;
              arguments_ = args[key].arguments || args[key].args || {};
            }
          }
        }

        // Use auto-fallback if no serverId provided
        const finalServerId =
          serverId || McpActionUtils.extractServerId(args || {}, mcpService);
        const finalArguments = arguments_ || {};

        console.log('[DEBUG] mcp-core-actions extracted values:', {
          finalServerId,
          name,
          finalArguments,
          originalArgsKeys: args ? Object.keys(args) : 'null',
        });
        console.log(
          '[DEBUG] Available servers:',
          mcpService
            .getConnectedServers()
            .map(s => ({ id: s.id, status: s.status })),
        );

        if (!finalServerId) {
          const servers = mcpService.getConnectedServers();
          const serverList = servers
            .map(s => `${s.id} (${s.status})`)
            .join(', ');
          throw new Error(
            `No MCP servers available. Available servers: ${serverList || 'none'}`,
          );
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          // Provide helpful error message for the LLM
          const availableTools =
            await mcpService.getServerCapabilities(finalServerId);
          const toolNames =
            availableTools?.tools?.map(t => t.name).join(', ') || 'none';
          console.log(
            '[DEBUG] Tool name missing. Args structure:',
            JSON.stringify(args, null, 2),
          );
          throw new Error(
            `Tool name is required and must be a non-empty string. Available tools: ${toolNames}. Please specify which tool to call using the 'name' parameter.`,
          );
        }

        try {
          const result = await mcpService.callTool(
            finalServerId,
            name.trim(),
            finalArguments,
          );
          console.log(
            '[DEBUG] Tool call successful, result:',
            JSON.stringify(result).substring(0, 200) + '...',
          );
          return result;
        } catch (error) {
          console.error('[ERROR] Tool call failed:', error);
          throw error;
        }
      },
    }),

    // Quick connect to Notion
    action({
      name: 'mcp.connectNotion',
      description:
        'Quick connect to Notion MCP server if not already connected',
      schema: createSchema({}),
      async handler(args: any, ctx: any, agent: any) {
        const servers = mcpService.getConnectedServers();
        const notionServer = servers.find(s => s.id.includes('notion'));

        if (notionServer) {
          return {
            success: true,
            message: `Notion server already connected: ${notionServer.id}`,
            serverId: notionServer.id,
          };
        }

        const serverId = `notion-${Date.now()}`;
        const config = mcpService.createServerConfigFromTemplate(
          'notion',
          serverId,
        );

        if (!config) {
          return {
            success: false,
            message: 'Failed to create Notion server config',
          };
        }

        const connected = await mcpService.connectToServer(config);

        return connected
          ? {
              success: true,
              message: `Connected to Notion MCP server: ${serverId}`,
              serverId,
            }
          : {
              success: false,
              message: 'Failed to connect to Notion MCP server',
            };
      },
    }),

    // Quick connect to Linear
    action({
      name: 'mcp.connectLinear',
      description:
        'Quick connect to Linear MCP server if not already connected',
      schema: createSchema({
        forceReconnect: z
          .boolean()
          .optional()
          .describe('Force reconnection even if server appears connected'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const servers = mcpService.getConnectedServers();
        const linearServer = servers.find(s => s.id.includes('linear'));

        // If force reconnect is requested, disconnect first
        if (args?.forceReconnect && linearServer) {
          console.log('[DEBUG] Force reconnecting Linear server...');
          await mcpService.disconnectServer(linearServer.id);
        } else if (linearServer) {
          // Test if existing connection actually works
          try {
            console.log('[DEBUG] Testing existing Linear connection...');
            const testResult = await mcpService.callTool(
              linearServer.id,
              'list_teams',
              {},
            );
            if (testResult && testResult.content) {
              return {
                success: true,
                message: `Linear server already connected and working: ${linearServer.id}`,
                serverId: linearServer.id,
                tested: true,
              };
            }
          } catch (error) {
            console.log(
              '[DEBUG] Existing Linear connection failed test, reconnecting...',
              error.message,
            );
            await mcpService.disconnectServer(linearServer.id);
          }
        }

        const serverId = `linear-${Date.now()}`;
        const config = mcpService.createServerConfigFromTemplate(
          'linear',
          serverId,
        );

        if (!config) {
          return {
            success: false,
            message: 'Failed to create Linear server config',
          };
        }

        console.log(
          '[DEBUG] Connecting to Linear with config:',
          JSON.stringify(config, null, 2),
        );

        try {
          const connected = await mcpService.connectToServer(config);

          if (connected) {
            // Test the connection by listing tools AND trying a real API call
            const capabilities =
              await mcpService.getServerCapabilities(serverId);
            console.log(
              `[DEBUG] Linear connection successful, found ${capabilities?.tools?.length || 0} tools`,
            );

            // Test with actual API call to verify authentication
            try {
              const testResult = await mcpService.callTool(
                serverId,
                'list_teams',
                {},
              );
              console.log('[DEBUG] Linear authentication test successful');

              return {
                success: true,
                message: `Connected to Linear MCP server and verified authentication: ${serverId}`,
                serverId,
                toolsCount: capabilities?.tools?.length || 0,
                authenticationTested: true,
              };
            } catch (authError) {
              console.warn(
                '[WARN] Linear connected but authentication failed:',
                authError.message,
              );
              return {
                success: false,
                message: `Linear connected but authentication failed. Token may be expired. Please try reconnecting with forceReconnect: true`,
                serverId,
                authenticationError: authError.message,
                suggestion:
                  'Try calling this action again with forceReconnect: true',
              };
            }
          } else {
            return {
              success: false,
              message: 'Failed to connect to Linear MCP server',
            };
          }
        } catch (error) {
          console.error('[ERROR] Linear connection failed:', error);
          return {
            success: false,
            message: `Failed to connect to Linear MCP server: ${error.message}`,
            error: error.message,
          };
        }
      },
    }),

    // Clean and reconnect Linear servers
    action({
      name: 'mcp.cleanLinear',
      description:
        'Clean all Linear servers (disconnect and remove) and establish fresh connection',
      schema: createSchema({}),
      async handler(args: any, ctx: any, agent: any) {
        console.log(
          '[DEBUG] Starting Linear cleanup and fresh reconnection...',
        );

        const servers = mcpService.getConnectedServers();
        const linearServers = servers.filter(s => s.id.includes('linear'));

        console.log(
          `[DEBUG] Found ${linearServers.length} Linear servers to clean:`,
        );
        linearServers.forEach(server => {
          console.log(`  - ${server.id} (${server.status})`);
        });

        // Disconnect all Linear servers
        for (const server of linearServers) {
          try {
            console.log(`[DEBUG] Disconnecting Linear server: ${server.id}`);
            await mcpService.disconnectServer(server.id);
          } catch (error) {
            console.warn(
              `[WARN] Failed to disconnect ${server.id}:`,
              error.message,
            );
          }
        }

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create fresh connection
        const serverId = `linear-clean-${Date.now()}`;
        const config = mcpService.createServerConfigFromTemplate(
          'linear',
          serverId,
        );

        if (!config) {
          return {
            success: false,
            message: 'Failed to create Linear server config',
            cleanedServers: linearServers.length,
          };
        }

        console.log(`[DEBUG] Creating fresh Linear connection: ${serverId}`);

        try {
          const connected = await mcpService.connectToServer(config);

          if (connected) {
            // Test the fresh connection
            const testResult = await mcpService.callTool(
              serverId,
              'list_teams',
              {},
            );

            return {
              success: true,
              message: `Successfully cleaned ${linearServers.length} old Linear servers and created fresh connection`,
              newServerId: serverId,
              cleanedServers: linearServers.length,
              authenticationTested: !!testResult?.content,
            };
          } else {
            return {
              success: false,
              message:
                'Cleaned old servers but failed to create fresh connection',
              cleanedServers: linearServers.length,
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Cleaned old servers but fresh connection failed: ${error.message}`,
            cleanedServers: linearServers.length,
            error: error.message,
          };
        }
      },
    }),

    // Diagnostic action for MCP servers
    action({
      name: 'mcp.diagnosticLinear',
      description: 'Diagnose Linear MCP connection and authentication issues',
      schema: createSchema({}),
      async handler(args: any, ctx: any, agent: any) {
        const servers = mcpService.getConnectedServers();
        const linearServers = servers.filter(s => s.id.includes('linear'));

        const diagnostics = {
          timestamp: new Date().toISOString(),
          linearServersFound: linearServers.length,
          servers: [],
          overallStatus: 'unknown',
        };

        if (linearServers.length === 0) {
          diagnostics.overallStatus = 'no_servers';
          return {
            status: 'no_linear_servers',
            message:
              'No Linear MCP servers found. Use mcp.connectLinear to connect.',
            diagnostics,
          };
        }

        // Test each Linear server
        for (const server of linearServers) {
          const serverDiag = {
            serverId: server.id,
            status: server.status,
            lastConnected: server.lastConnected,
            capabilitiesTest: 'not_tested',
            authenticationTest: 'not_tested',
            error: null,
          };

          try {
            // Test capabilities
            const capabilities = await mcpService.getServerCapabilities(
              server.id,
            );
            if (
              capabilities &&
              capabilities.tools &&
              capabilities.tools.length > 0
            ) {
              serverDiag.capabilitiesTest = 'passed';

              // Test authentication with actual API call
              try {
                const authTestResult = await mcpService.callTool(
                  server.id,
                  'list_teams',
                  {},
                );
                if (authTestResult && authTestResult.content) {
                  serverDiag.authenticationTest = 'passed';
                } else {
                  serverDiag.authenticationTest = 'failed_no_content';
                }
              } catch (authError) {
                serverDiag.authenticationTest = 'failed';
                serverDiag.error = authError.message;
              }
            } else {
              serverDiag.capabilitiesTest = 'failed';
            }
          } catch (error) {
            serverDiag.capabilitiesTest = 'failed';
            serverDiag.error = error.message;
          }

          diagnostics.servers.push(serverDiag);
        }

        // Determine overall status
        const workingServers = diagnostics.servers.filter(
          s =>
            s.capabilitiesTest === 'passed' &&
            s.authenticationTest === 'passed',
        );

        if (workingServers.length > 0) {
          diagnostics.overallStatus = 'healthy';
        } else if (
          diagnostics.servers.some(s => s.capabilitiesTest === 'passed')
        ) {
          diagnostics.overallStatus = 'authentication_issues';
        } else {
          diagnostics.overallStatus = 'connection_issues';
        }

        // Helper function for diagnostic messages
        const getDiagnosticMessage = (status: string): string => {
          switch (status) {
            case 'healthy':
              return 'Linear MCP connection is healthy and authentication is working.';
            case 'authentication_issues':
              return 'Linear MCP is connected but authentication has failed. OAuth tokens may be expired. Try mcp.connectLinear with forceReconnect: true.';
            case 'connection_issues':
              return 'Linear MCP has connection issues. Try disconnecting and reconnecting.';
            case 'no_servers':
              return 'No Linear MCP servers connected. Use mcp.connectLinear to establish connection.';
            default:
              return 'Unknown status. Run diagnostics again.';
          }
        };

        return {
          status: diagnostics.overallStatus,
          message: getDiagnosticMessage(diagnostics.overallStatus),
          diagnostics,
          workingServers: workingServers.length,
          totalServers: diagnostics.servers.length,
        };
      },
    }),

    // Helper actions for common Linear tools
    action({
      name: 'linear.listTeams',
      description:
        'List teams in Linear workspace with automatic reconnection on auth failure',
      schema: createSchema({
        serverId: z
          .string()
          .optional()
          .describe('Linear server ID (auto-detected if not provided)'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const serverId =
          args?.serverId ||
          McpActionUtils.extractServerId(args || {}, mcpService);

        if (!serverId) {
          throw new Error(
            'No Linear MCP server available. Please connect to Linear first using mcp.connectLinear',
          );
        }

        try {
          return await mcpService.callTool(serverId, 'list_teams', {});
        } catch (error) {
          // If authentication fails, suggest reconnection
          if (
            error.message.includes('404') ||
            error.message.includes('Invalid arguments') ||
            error.message.includes('authentication')
          ) {
            throw new Error(
              `Linear authentication failed: ${error.message}. Your OAuth token may have expired. Please use mcp.connectLinear with forceReconnect: true to reauthenticate.`,
            );
          }
          throw error;
        }
      },
    }),

    action({
      name: 'linear.listMyIssues',
      description:
        'List issues assigned to the current user in Linear with automatic reconnection on auth failure',
      schema: createSchema({
        serverId: z
          .string()
          .optional()
          .describe('Linear server ID (auto-detected if not provided)'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const serverId =
          args?.serverId ||
          McpActionUtils.extractServerId(args || {}, mcpService);

        if (!serverId) {
          throw new Error(
            'No Linear MCP server available. Please connect to Linear first using mcp.connectLinear',
          );
        }

        try {
          return await mcpService.callTool(serverId, 'list_my_issues', {});
        } catch (error) {
          // If authentication fails, suggest reconnection
          if (
            error.message.includes('404') ||
            error.message.includes('Invalid arguments') ||
            error.message.includes('authentication')
          ) {
            throw new Error(
              `Linear authentication failed: ${error.message}. Your OAuth token may have expired. Please use mcp.connectLinear with forceReconnect: true to reauthenticate.`,
            );
          }
          throw error;
        }
      },
    }),

    action({
      name: 'linear.listIssues',
      description: 'List issues in a Linear team',
      schema: createSchema({
        teamId: z.string().optional().describe('Team ID to filter issues'),
        serverId: z
          .string()
          .optional()
          .describe('Linear server ID (auto-detected if not provided)'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const serverId =
          args?.serverId ||
          McpActionUtils.extractServerId(args || {}, mcpService);

        if (!serverId) {
          throw new Error(
            'No Linear MCP server available. Please connect to Linear first using mcp.connectLinear',
          );
        }

        const toolArgs: Record<string, any> = {};
        if (args?.teamId) {
          toolArgs.team_id = args.teamId;
        }

        return await mcpService.callTool(serverId, 'list_issues', toolArgs);
      },
    }),

    action({
      name: 'linear.getIssue',
      description: 'Get details of a specific Linear issue',
      schema: createSchema({
        issueId: z.string().describe("Issue ID or identifier (e.g., 'ZKO-42')"),
        serverId: z
          .string()
          .optional()
          .describe('Linear server ID (auto-detected if not provided)'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const serverId =
          args?.serverId ||
          McpActionUtils.extractServerId(args || {}, mcpService);

        if (!serverId) {
          throw new Error(
            'No Linear MCP server available. Please connect to Linear first using mcp.connectLinear',
          );
        }

        if (!args?.issueId) {
          throw new Error(
            "Issue ID is required. Please provide the issue ID or identifier (e.g., 'ZKO-42')",
          );
        }

        return await mcpService.callTool(serverId, 'get_issue', {
          issue_id: args.issueId,
        });
      },
    }),

    action({
      name: 'linear.createIssue',
      description: 'Create a new Linear issue',
      schema: createSchema({
        title: z.string().describe('Issue title'),
        description: z.string().optional().describe('Issue description'),
        teamId: z.string().optional().describe('Team ID'),
        priority: z.number().optional().describe('Priority level (1-4)'),
        serverId: z
          .string()
          .optional()
          .describe('Linear server ID (auto-detected if not provided)'),
      }),
      async handler(args: any, ctx: any, agent: any) {
        const serverId =
          args?.serverId ||
          McpActionUtils.extractServerId(args || {}, mcpService);

        if (!serverId) {
          throw new Error(
            'No Linear MCP server available. Please connect to Linear first using mcp.connectLinear',
          );
        }

        if (!args?.title) {
          throw new Error('Issue title is required');
        }

        const toolArgs: Record<string, any> = {
          title: args.title,
        };

        if (args.description) toolArgs.description = args.description;
        if (args.teamId) toolArgs.team_id = args.teamId;
        if (args.priority) toolArgs.priority = args.priority;

        return await mcpService.callTool(serverId, 'create_issue', toolArgs);
      },
    }),
  ];
}
