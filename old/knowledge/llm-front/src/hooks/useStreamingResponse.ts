import { useState, useCallback, useRef, useEffect } from 'react';
import { httpService } from '@/services/http.service';
import { parseApiError } from '@/utils/error-handler';

export interface StreamingMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  rawResponse?: any[];
  isStreaming?: boolean;
  streamingContent?: string;
}

export interface UseStreamingResponseProps {
  onMessageUpdate?: (message: StreamingMessage) => void;
}

export function useStreamingResponse({
  onMessageUpdate,
}: UseStreamingResponseProps = {}) {
  const [streamingMessage, setStreamingMessage] =
    useState<StreamingMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  const startStreaming = useCallback(
    async (agentId: string, requestPayload: any, apiUrl: string) => {
      // Check if we have all required parameters
      if (!agentId) {
        throw new Error('Agent ID is required');
      }
      
      if (!apiUrl) {
        throw new Error('API URL is required');
      }
      
      // Check if already streaming using ref (more reliable than state)
      if (isStreamingRef.current) {
        return;
      }
      
      setIsStreaming(true);
      isStreamingRef.current = true;

      // Create initial streaming message
      const initialMessage: StreamingMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        streamingContent: '',
        rawResponse: [],
      };

      setStreamingMessage(initialMessage);
      onMessageUpdate?.(initialMessage);

      // Only abort if there's a controller AND we're not currently streaming
      if (abortControllerRef.current && !isStreamingRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Create new AbortController
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      try {
        // Get the token from httpService
        const token = httpService.getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };

        // Add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Use fetch with streaming for POST requests (EventSource only supports GET)
        const streamUrl = `${apiUrl}/daydreams/agents/${agentId}/stream`;

        let response;
        try {
          response = await fetch(streamUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestPayload),
            signal: newAbortController.signal,
          });
        } catch (fetchError) {
          throw fetchError;
        }

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }
          const errorMessage = errorData
            ? parseApiError(response, errorData)
            : `Streaming request failed: ${response.status}`;
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No readable stream available');
        }

        const decoder = new TextDecoder();
        let currentMessage = initialMessage;
        let allRawResponses: any[] = [];
        let buffer = '';
        let lastChatResponseLength = 0;
        let chatResponseCount = 0;
        let chunkCount = 0;

        let streamEnded = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            chunkCount++;

            if (done) {
              streamEnded = true;
              break;
            }

            // Decode the chunk and add to buffer
            const decodedChunk = decoder.decode(value, { stream: true });
            buffer += decodedChunk;

            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6); // Remove 'data: ' prefix
                if (dataStr.trim() === '') continue;

                try {
                  const data = JSON.parse(dataStr);
                  
                  // Debug log for stream end events
                  if (data.type === 'end' || data.type === 'complete' || data.type === 'stream_complete') {
                    console.log('[Stream] Received end event:', data.type);
                  }

                  // Add to raw responses for debugging
                  // Pour les outputs streaming, détecter les nouvelles réponses
                  if (
                    data.type === 'log_stream' &&
                    data.data?.ref === 'output' &&
                    data.data?.type === 'chat:response'
                  ) {
                    const currentContent =
                      data.data?.data?.content || data.data?.content || '';

                    // Si le contenu est plus court que le précédent, c'est une nouvelle réponse
                    if (
                      currentContent.length < lastChatResponseLength &&
                      lastChatResponseLength > 0
                    ) {
                      chatResponseCount++;
                    }
                    lastChatResponseLength = currentContent.length;

                    // Enrichir avec un ID de streaming
                    data.data = {
                      ...data.data,
                      streamingId: `chat-response-${chatResponseCount}`,
                    };
                  }

                  allRawResponses.push(data);

                  // Handle the streaming data and update currentMessage
                  const updatedMessage = await handleStreamingData(
                    data,
                    currentMessage,
                    allRawResponses,
                    setStreamingMessage,
                    onMessageUpdate,
                  );
                  if (updatedMessage) {
                    currentMessage = updatedMessage;
                  }
                } catch (parseError) {
                  // Silently ignore parse errors for now
                }
              }
            }
          }
        } finally {
          console.log('[Stream] Reader loop ended, streamEnded:', streamEnded);
          reader.releaseLock();
        }
      } catch (error) {
        // Check if it's an abort error
        if (error instanceof Error && error.name === 'AbortError') {
          // Don't fallback for abort errors
          return;
        }

        // Only fallback for non-abort errors
        if (!(error instanceof Error && error.message.includes('aborted'))) {
          await fallbackToNonStreaming(
            agentId,
            requestPayload,
            apiUrl,
            initialMessage,
          );
        }
      } finally {
        setIsStreaming(false);
        isStreamingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [onMessageUpdate],
  );

  // Helper function to handle streaming data
  const handleStreamingData = async (
    data: any,
    currentMessage: StreamingMessage,
    allRawResponses: any[],
    setStreamingMessage: (msg: StreamingMessage) => void,
    onMessageUpdate?: (msg: StreamingMessage) => void,
  ): Promise<StreamingMessage | null> => {
    switch (data.type) {
      case 'start':
        return null;

      case 'processing':
        return null;

      case 'log_stream':

        // Store log in raw responses
        allRawResponses.push(data.data);

        // Handle output logs specifically
        if (
          data.data?.ref === 'output' &&
          data.data?.type === 'chat:response'
        ) {
          // Try multiple paths to extract content
          const logContent =
            data.data?.data?.data?.content || 
            data.data?.data?.content || 
            data.data?.content || '';
          
          if (logContent && logContent.length > currentMessage.content.length) {
            const updatedMessage = {
              ...currentMessage,
              content: logContent,
              streamingContent: logContent,
              rawResponse: allRawResponses,
              isStreaming: !data.done,
            };
            setStreamingMessage(updatedMessage);
            onMessageUpdate?.(updatedMessage);
            return updatedMessage;
          }
        }
        return null;

      case 'action_call':
        allRawResponses.push(data.data);
        return null;

      case 'action_result':
        allRawResponses.push(data.data);
        return null;

      case 'thought':
        allRawResponses.push(data.data);
        return null;

      case 'thinking':
        allRawResponses.push(data.data);
        return null;

      case 'step':
        allRawResponses.push(data.data);
        // Update the message to trigger a re-render
        const updatedMsg = {
          ...currentMessage,
          rawResponse: allRawResponses,
          isStreaming: true,
        };
        setStreamingMessage(updatedMsg);
        onMessageUpdate?.(updatedMsg);
        return updatedMsg;

      case 'stream_complete':
        const finalMessage = {
          ...currentMessage,
          rawResponse: allRawResponses,
          isStreaming: false,
        };
        setStreamingMessage(finalMessage);
        onMessageUpdate?.(finalMessage);
        return finalMessage;

      case 'response_chunk':
        // Handle response chunks with partial content
        const content =
          data.data?.partialContent ||
          data.data?.data?.data?.content ||
          data.data?.data?.content ||
          data.data?.content ||
          '';
        if (content) {
          const updatedMessage = {
            ...currentMessage,
            content: content,
            streamingContent: content,
            rawResponse: allRawResponses,
            isStreaming: data.data?.isPartial !== false,
          };
          setStreamingMessage(updatedMessage);
          onMessageUpdate?.(updatedMessage);
          return updatedMessage;
        }
        return null;

      case 'complete':
        const completedMessage = {
          ...currentMessage,
          rawResponse: allRawResponses,
          isStreaming: false,
        };
        setStreamingMessage(completedMessage);
        onMessageUpdate?.(completedMessage);
        return completedMessage;

      case 'error':
        const errorMessage: StreamingMessage = {
          ...currentMessage,
          content: data.data?.error || 'Erreur lors du streaming',
          isStreaming: false,
          rawResponse: allRawResponses,
        };
        setStreamingMessage(errorMessage);
        onMessageUpdate?.(errorMessage);
        return errorMessage;

      case 'end':
        const endedMessage = {
          ...currentMessage,
          rawResponse: allRawResponses,
          isStreaming: false,
        };
        setStreamingMessage(endedMessage);
        onMessageUpdate?.(endedMessage);
        return endedMessage;

      default:
        return null;
    }
  };

  // Fallback method for when streaming fails
  const fallbackToNonStreaming = async (
    agentId: string,
    requestPayload: any,
    apiUrl: string,
    initialMessage: StreamingMessage,
  ) => {
    try {
      // Get the token from httpService
      const token = httpService.getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${apiUrl}/daydreams/agents/${agentId}/send`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestPayload),
        },
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = null;
        }
        const errorMessage = errorData
          ? parseApiError(response, errorData)
          : `API request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      await simulateStreamingFromResponse(data, initialMessage);
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      const errorMessage: StreamingMessage = {
        ...initialMessage,
        content: "Erreur lors de la communication avec l'assistant.",
        isStreaming: false,
      };
      setStreamingMessage(errorMessage);
      onMessageUpdate?.(errorMessage);
    }
  };

  const simulateStreamingFromResponse = async (
    data: any,
    initialMessage: StreamingMessage,
  ) => {
    let finalContent = '';
    let rawResponse: any[] = [];

    if (Array.isArray(data.response)) {
      rawResponse = data.response;

      // Find the chat:response content first
      const chatResponseItem = data.response.find(
        (item: any) =>
          item.ref === 'output' &&
          item.type === 'chat:response' &&
          item.data?.content,
      );

      if (chatResponseItem) {
        finalContent = chatResponseItem.data.content;

        // Stream the content character by character
        for (let i = 0; i <= finalContent.length; i++) {
          const streamingContent = finalContent.substring(0, i);

          const updatedMessage: StreamingMessage = {
            ...initialMessage,
            content: streamingContent,
            streamingContent: streamingContent,
            rawResponse: rawResponse,
            isStreaming: i < finalContent.length,
          };

          setStreamingMessage(updatedMessage);
          onMessageUpdate?.(updatedMessage);

          // Add delay to simulate streaming (faster for better UX)
          if (i < finalContent.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      } else {
        // Fallback: look for any output
        const outputs = data.response.filter(
          (item: any) =>
            item.ref === 'output' ||
            (item.ref === 'step' && item.data?.response),
        );

        if (outputs.length > 0) {
          const output = outputs[outputs.length - 1];
          finalContent =
            output.content || output.data?.response || JSON.stringify(output);
        } else {
          const lastItem = data.response[data.response.length - 1];
          finalContent =
            lastItem.content ||
            lastItem.data?.response ||
            'No direct output found in response.';
        }

        // Stream this content too
        for (let i = 0; i <= finalContent.length; i++) {
          const streamingContent = finalContent.substring(0, i);

          const updatedMessage: StreamingMessage = {
            ...initialMessage,
            content: streamingContent,
            streamingContent: streamingContent,
            rawResponse: rawResponse,
            isStreaming: i < finalContent.length,
          };

          setStreamingMessage(updatedMessage);
          onMessageUpdate?.(updatedMessage);

          if (i < finalContent.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }
    } else {
      // Handle non-array response
      finalContent = data.response?.content || data.content || 'Réponse reçue';
      rawResponse = data.response ? [data.response] : [];

      // Stream this content
      for (let i = 0; i <= finalContent.length; i++) {
        const streamingContent = finalContent.substring(0, i);

        const updatedMessage: StreamingMessage = {
          ...initialMessage,
          content: streamingContent,
          streamingContent: streamingContent,
          rawResponse: rawResponse,
          isStreaming: i < finalContent.length,
        };

        setStreamingMessage(updatedMessage);
        onMessageUpdate?.(updatedMessage);

        if (i < finalContent.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    // Final message
    const finalMessage: StreamingMessage = {
      ...initialMessage,
      content: finalContent,
      streamingContent: finalContent,
      rawResponse,
      isStreaming: false,
    };

    setStreamingMessage(finalMessage);
    onMessageUpdate?.(finalMessage);
  };

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessage(null);
  }, []);

  const clearStreamingMessage = useCallback(() => {
    setStreamingMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    streamingMessage,
    isStreaming,
    startStreaming,
    stopStreaming,
    clearStreamingMessage,
  };
}
