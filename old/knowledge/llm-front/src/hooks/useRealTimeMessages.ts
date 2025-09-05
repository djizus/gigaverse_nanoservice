import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types/session';

interface UseRealTimeMessagesProps {
  sessionId: string;
  onNewMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
  enabled?: boolean;
}

export function useRealTimeMessages({
  sessionId,
  onNewMessage,
  onError,
  pollingInterval = 2000,
  enabled = true,
}: UseRealTimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `${API_URL}/daydreams/agents/${sessionId}/sessions`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const sessionMessages = data.messages || [];

      // Check for new messages
      if (sessionMessages.length > 0) {
        const latestMessage = sessionMessages[sessionMessages.length - 1];

        if (latestMessage.id !== lastMessageId) {
          setMessages(sessionMessages);
          setLastMessageId(latestMessage.id);

          // Call onNewMessage callback if provided
          if (onNewMessage) {
            onNewMessage(latestMessage);
          }
        }
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsConnected(false);

      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  const startPolling = () => {
    if (!enabled || !sessionId) return;

    // Clear existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Initial fetch
    fetchMessages();

    // Start polling
    pollingRef.current = window.setInterval(fetchMessages, pollingInterval);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const reconnect = () => {
    stopPolling();

    reconnectTimeoutRef.current = window.setTimeout(() => {
      console.log('Attempting to reconnect...');
      startPolling();
    }, 5000);
  };

  useEffect(() => {
    if (enabled && sessionId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, sessionId, pollingInterval]);

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (!isConnected && enabled) {
      reconnect();
    }
  }, [isConnected, enabled]);

  return {
    messages,
    isConnected,
    reconnect,
    stopPolling,
  };
}
