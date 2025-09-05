import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { McpService } from '../services/mcp.service';
import {
  McpServerConfig,
  McpServerTemplate,
  McpServerInfo,
  McpServerCapabilities,
} from '../types/mcp';

export interface ConnectServerDto {
  templateId?: string;
  serverConfig?: McpServerConfig;
  overrides?: Partial<McpServerConfig>;
}

export interface CallToolDto {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ReadResourceDto {
  serverId: string;
  uri: string;
}

export interface GetPromptDto {
  serverId: string;
  promptName: string;
  arguments?: Record<string, unknown>;
}

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  /**
   * Get all available MCP server templates
   */
  @Get('templates')
  getTemplates(): McpServerTemplate[] {
    return this.mcpService.getTemplates();
  }

  /**
   * Get a specific MCP server template
   */
  @Get('templates/:templateId')
  getTemplate(@Param('templateId') templateId: string): McpServerTemplate {
    const template = this.mcpService.getTemplate(templateId);
    if (!template) {
      throw new HttpException(
        `Template ${templateId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return template;
  }

  /**
   * Create server config from template
   */
  @Post('templates/:templateId/config')
  createServerConfigFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { serverId: string; overrides?: Partial<McpServerConfig> },
  ): McpServerConfig {
    const config = this.mcpService.createServerConfigFromTemplate(
      templateId,
      body.serverId,
      body.overrides,
    );

    if (!config) {
      throw new HttpException(
        `Template ${templateId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return config;
  }

  /**
   * Connect to an MCP server
   */
  @Post('servers/connect')
  async connectServer(
    @Body() body: ConnectServerDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      let serverConfig: McpServerConfig;

      if (body.templateId) {
        // Create config from template
        const tempServerId = `server_${Date.now()}`;
        const config = this.mcpService.createServerConfigFromTemplate(
          body.templateId,
          tempServerId,
          body.overrides,
        );

        if (!config) {
          throw new HttpException(
            `Template ${body.templateId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }

        serverConfig = config;
      } else if (body.serverConfig) {
        // Use provided config
        serverConfig = body.serverConfig;
      } else {
        throw new HttpException(
          'Either templateId or serverConfig must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const success = await this.mcpService.connectToServer(serverConfig);

      if (success) {
        return {
          success: true,
          message: `Successfully connected to server ${serverConfig.name}`,
        };
      } else {
        throw new HttpException(
          'Failed to connect to server',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error('Error connecting to MCP server:', error);

      // For Linear MCP OAuth authentication errors, provide helpful guidance
      if (
        error.message?.includes('Request timed out') &&
        body.templateId === 'linear'
      ) {
        throw new HttpException(
          `Linear MCP authentication failed. This requires browser access for OAuth. In hosted environments, consider using a tunnel (ngrok) or wait for Linear direct token support. Auth URL should appear in server logs.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to connect to server: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all connected servers
   */
  @Get('servers')
  getConnectedServers(): McpServerInfo[] {
    return this.mcpService.getConnectedServers();
  }

  /**
   * Get specific server info
   */
  @Get('servers/:serverId')
  getServerInfo(@Param('serverId') serverId: string): McpServerInfo {
    const info = this.mcpService.getServerInfo(serverId);
    if (!info) {
      throw new HttpException(
        `Server ${serverId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return info;
  }

  /**
   * Get server capabilities
   */
  @Get('servers/:serverId/capabilities')
  async getServerCapabilities(
    @Param('serverId') serverId: string,
  ): Promise<McpServerCapabilities> {
    const capabilities = await this.mcpService.getServerCapabilities(serverId);
    if (!capabilities) {
      throw new HttpException(
        `Server ${serverId} not found or not connected`,
        HttpStatus.NOT_FOUND,
      );
    }
    return capabilities;
  }

  /**
   * Disconnect from a server
   */
  @Delete('servers/:serverId')
  async disconnectServer(
    @Param('serverId') serverId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.mcpService.disconnectServer(serverId);
      return {
        success: true,
        message: `Successfully disconnected from server ${serverId}`,
      };
    } catch (error) {
      this.logger.error(`Error disconnecting from server ${serverId}:`, error);
      throw new HttpException(
        `Failed to disconnect from server: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Call a tool on an MCP server
   */
  @Post('tools/call')
  async callTool(@Body() body: CallToolDto): Promise<any> {
    try {
      const result = await this.mcpService.callTool(
        body.serverId,
        body.toolName,
        body.arguments,
      );
      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Error calling tool ${body.toolName} on server ${body.serverId}:`,
        error,
      );
      throw new HttpException(
        `Failed to call tool: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Read a resource from an MCP server
   */
  @Post('resources/read')
  async readResource(@Body() body: ReadResourceDto): Promise<any> {
    try {
      const result = await this.mcpService.readResource(
        body.serverId,
        body.uri,
      );
      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Error reading resource ${body.uri} from server ${body.serverId}:`,
        error,
      );
      throw new HttpException(
        `Failed to read resource: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  @Post('prompts/get')
  async getPrompt(@Body() body: GetPromptDto): Promise<any> {
    try {
      const result = await this.mcpService.getPrompt(
        body.serverId,
        body.promptName,
        body.arguments,
      );
      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Error getting prompt ${body.promptName} from server ${body.serverId}:`,
        error,
      );
      throw new HttpException(
        `Failed to get prompt: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get MCP events (for monitoring/debugging)
   */
  @Get('events')
  getMcpEvents(): any[] {
    // TODO: Implement event storage and retrieval
    // For now, return empty array
    return [];
  }
}
