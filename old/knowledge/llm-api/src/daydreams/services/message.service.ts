import { Injectable, Logger } from '@nestjs/common';
import { AgentRequest, AgentResponse } from '../daydreams.service';
import { SupabaseStorageService } from './supabase-storage.service';

export interface MessageChunk {
  type: string;
  data: any;
  done?: boolean;
}

export interface StreamingHandlers {
  onChunk: (chunk: MessageChunk) => void;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly storageService: SupabaseStorageService) {}

  /**
   * Send a message to an agent and get the complete response
   */
  async sendMessage(
    agent: any,
    agentId: string,
    request: AgentRequest,
  ): Promise<AgentResponse[]> {
    try {
      this.logger.log(`Sending message to agent ${agentId}`);

      // Save user message
      await this.saveUserMessage(request, agentId);

      // Inject knowledge if available
      await this.injectKnowledge(request);

      // Send to agent
      const response = await agent.send({
        context: request.context,
        args: request.args,
        input: request.input,
      });

      // Save assistant response
      await this.saveAssistantResponse(request, response, agentId);

      return response as AgentResponse[];
    } catch (error) {
      this.logger.error(`Error sending message to agent ${agentId}:`, error);
      return [
        {
          ref: 'output',
          content: `Error processing request: ${error.message}`,
          type: 'error',
        },
      ];
    }
  }

  /**
   * Stream a message to an agent with real-time chunks
   */
  async streamMessage(
    agent: any,
    agentId: string,
    request: AgentRequest,
    handlers: StreamingHandlers,
  ): Promise<void> {
    try {
      this.logger.log(`Streaming message to agent ${agentId}`);

      const requestSessionId = request.args?.sessionId;
      if (requestSessionId && typeof requestSessionId === 'string') {
        this.logger.log(
          `Processing session ${requestSessionId} for agent ${agentId}`,
        );
      }

      // Save user message
      await this.saveUserMessage(request, agentId);

      // Inject knowledge if available
      await this.injectKnowledge(request);

      // Send processing event
      handlers.onChunk({
        type: 'processing',
        data: { status: 'processing_message', sessionId: requestSessionId },
      });

      // Configure streaming request with handlers
      let currentContent = '';
      let hasStartedStreaming = false;

      const streamingRequest = {
        context: request.context,
        args: request.args,
        input: request.input,
        handlers: {
          onLogStream: (log: any, done: boolean) => {
            this.logger.debug(`onLogStream: ${log.ref}/${log.type}`, { done });

            // Handle different types of logs
            if (!hasStartedStreaming && log.ref !== 'input') {
              hasStartedStreaming = true;
              handlers.onChunk({
                type: 'start',
                data: { status: 'streaming_started' },
              });
            }

            // Stream each log as it comes
            handlers.onChunk({
              type: 'log_stream',
              data: log,
              done,
            });

            // Special handling for output logs with content
            if (log.ref === 'output' && log.type === 'chat:response') {
              const content = log.data?.content || log.content || '';
              if (content && content !== currentContent) {
                currentContent = content;
                handlers.onChunk({
                  type: 'response_chunk',
                  data: {
                    ...log,
                    isPartial: !done,
                    partialContent: content,
                  },
                });
              }
            }

            // Handle action calls, results, thinking, steps
            if (log.ref === 'call') {
              handlers.onChunk({ type: 'action_call', data: log });
            }
            if (log.ref === 'result') {
              handlers.onChunk({ type: 'action_result', data: log });
            }
            if (log.ref === 'thought') {
              handlers.onChunk({ type: 'thought', data: log });
            }
            if (log.ref === 'step') {
              handlers.onChunk({ type: 'step', data: log });
            }

            // Send complete event when done
            if (done) {
              handlers.onChunk({
                type: 'stream_complete',
                data: { status: 'completed' },
              });
            }
          },
          onThinking: (thought: any) => {
            this.logger.debug(`onThinking called:`, thought);
            handlers.onChunk({
              type: 'thinking',
              data: thought,
            });
          },
        },
      };

      // Send with streaming handlers
      const response = await agent.send(streamingRequest);

      // Save assistant response
      await this.saveAssistantResponse(request, response, agentId);

      handlers.onChunk({
        type: 'complete',
        data: { status: 'completed', totalChunks: response.length },
      });
    } catch (error) {
      this.logger.error(`Error streaming message to agent ${agentId}:`, error);
      handlers.onChunk({
        type: 'error',
        data: {
          ref: 'output',
          content: `Error processing request: ${error.message}`,
          type: 'error',
        },
      });
    }
  }

  /**
   * Validate message request
   */
  validateMessageRequest(request: AgentRequest): {
    isValid: boolean;
    error?: string;
  } {
    if (!request.input?.data) {
      return { isValid: false, error: 'Message input data is required' };
    }

    const messageContent =
      request.input.data.prompt || request.input.data.message;
    if (!messageContent || typeof messageContent !== 'string') {
      return {
        isValid: false,
        error:
          "Message content is required (provide 'content', 'prompt' or 'message')",
      };
    }

    if (messageContent.trim().length === 0) {
      return { isValid: false, error: 'Message content cannot be empty' };
    }

    return { isValid: true };
  }

  /**
   * Save user message to storage
   */
  private async saveUserMessage(
    request: AgentRequest,
    agentId: string,
  ): Promise<void> {
    const sessionId = request.args?.sessionId;
    const userMessage =
      request.input?.data?.prompt || request.input?.data?.message;

    if (
      sessionId &&
      typeof sessionId === 'string' &&
      userMessage &&
      typeof userMessage === 'string'
    ) {
      try {
        await this.storageService.addMessageToConversation(
          sessionId,
          {
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
          },
          agentId,
        );
        this.logger.debug(`Saved user message to session ${sessionId}`);
      } catch (error) {
        this.logger.warn('Failed to save user message:', error);
      }
    }
  }

  /**
   * Save assistant response to storage
   */
  private async saveAssistantResponse(
    request: AgentRequest,
    response: any[],
    agentId: string,
  ): Promise<void> {
    const sessionId = request.args?.sessionId;

    if (
      sessionId &&
      typeof sessionId === 'string' &&
      response &&
      response.length > 0
    ) {
      try {
        let assistantContent = 'No response content';

        const outputResponse = response.find(item => item.ref === 'output');
        if (outputResponse && 'content' in outputResponse) {
          assistantContent = outputResponse.content;
        } else {
          for (let i = response.length - 1; i >= 0; i--) {
            const item = response[i];
            if ('content' in item && item.content) {
              assistantContent = item.content;
              break;
            }
          }
        }

        await this.storageService.addMessageToConversation(
          sessionId,
          {
            role: 'assistant',
            content: assistantContent,
            timestamp: Date.now(),
            rawResponse: response,
          },
          agentId,
        );
        this.logger.debug(`Saved assistant response to session ${sessionId}`);
      } catch (error) {
        this.logger.warn('Failed to save assistant response:', error);
      }
    }
  }

  /**
   * Inject knowledge into request if available
   * TODO: Integrate with new knowledge module service
   */
  private async injectKnowledge(request: AgentRequest): Promise<void> {
    const prompt = request.input?.data?.prompt;
    if (typeof prompt === 'string' && prompt.trim().length > 0) {
      try {
        // TODO: Integrate with new knowledge module service
        // const chromaResults = await queryChroma("knowledge", prompt, 3);
        // const knowledgeText = chromaResults.documents[0]?.join("\n\n") || "";
        // request.input.data.knowledge = knowledgeText;
        this.logger.debug('Knowledge injection temporarily disabled');
      } catch (error) {
        this.logger.error('Knowledge search failed:', error);
      }
    }
  }
}
