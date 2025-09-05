import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MessageService, MessageChunk } from './message.service';
import { AgentRequest } from '../daydreams.service';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(private readonly messageService: MessageService) {}

  /**
   * Handle SSE streaming for agent messages
   */
  async handleStreamRequest(
    agent: any,
    agentId: string,
    request: AgentRequest,
    response: Response,
  ): Promise<void> {
    try {
      // Set SSE headers
      this.setupSSEHeaders(response);

      // Validate the request
      const validation = this.messageService.validateMessageRequest(request);
      if (!validation.isValid) {
        this.sendSSEError(response, validation.error);
        return;
      }

      // Send initial event
      this.sendSSEEvent(response, {
        type: 'start',
        data: {
          agentId,
          sessionId: request.args?.sessionId,
          userId: request.args?.userId,
        },
      });

      // Stream the response using MessageService
      await this.messageService.streamMessage(agent, agentId, request, {
        onChunk: (chunk: MessageChunk) => {
          this.sendSSEEvent(response, chunk);
        },
      });

      // Send end event
      this.sendSSEEvent(response, {
        type: 'end',
        data: { completed: true },
      });

      response.end();
    } catch (error) {
      this.logger.error(`Error in SSE stream for agent ${agentId}:`, error);
      this.sendSSEError(response, error.message || 'Failed to stream message');
    }
  }

  /**
   * Setup Server-Sent Events headers
   */
  private setupSSEHeaders(response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  }

  /**
   * Send SSE event to client
   */
  private sendSSEEvent(response: Response, event: MessageChunk): void {
    const data = JSON.stringify(event);
    response.write(`data: ${data}\\n\\n`);
  }

  /**
   * Send SSE error event to client
   */
  private sendSSEError(response: Response, errorMessage: string): void {
    const errorEvent = {
      type: 'error',
      data: {
        error: errorMessage,
      },
    };
    this.sendSSEEvent(response, errorEvent);
    response.end();
  }

  /**
   * Validate SSE request parameters
   */
  validateStreamingRequest(
    agentId: string,
    request: AgentRequest,
  ): { isValid: boolean; error?: string } {
    if (!agentId || typeof agentId !== 'string') {
      return { isValid: false, error: 'Agent ID is required' };
    }

    if (!request.context || typeof request.context !== 'string') {
      return { isValid: false, error: 'Context is required' };
    }

    return this.messageService.validateMessageRequest(request);
  }

  /**
   * Build enriched context arguments for streaming
   */
  buildStreamingContextArgs(
    request: AgentRequest,
    agentConfig: any,
    contextId: string,
  ): any {
    const baseContextArgs = agentConfig.contextArgs[contextId] || {};

    // Add sessionId and userId if provided in the request
    const sessionId =
      request.args?.sessionId ||
      baseContextArgs.sessionId ||
      `session-${Date.now()}`;
    const userId = request.args?.userId || baseContextArgs.userId || 'user';

    return {
      ...baseContextArgs,
      sessionId,
      userId,
      // Add agent instructions and name so the context can use them
      agentInstructions:
        agentConfig.instructions || 'You are a helpful AI assistant.',
      agentName: agentConfig.name || 'Assistant',
    };
  }

  /**
   * Extract message content from DTO (backward compatibility)
   */
  extractMessageContent(dto: any): string | null {
    return dto.content || dto.message || null;
  }

  /**
   * Build request object for streaming
   */
  buildStreamingRequest(
    contextId: string,
    enrichedContextArgs: any,
    dto: any,
  ): AgentRequest {
    const messageContent = this.extractMessageContent(dto);

    return {
      context: contextId,
      args: enrichedContextArgs,
      input: {
        type: 'chat',
        data: dto.input?.data || {
          prompt: messageContent, // Use 'prompt' for the chat input
          message: messageContent,
          sender: enrichedContextArgs.userId,
        },
      },
    };
  }
}
