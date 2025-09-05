import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  rawResponse?: any[];
}

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp || Date.now()}
            />
          ))}
          {isLoading && (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-muted-foreground">
                Assistant is typing...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  );
};
