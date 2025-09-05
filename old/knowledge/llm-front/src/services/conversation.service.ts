import { httpService } from './http.service';

export interface Conversation {
  sessionId: string;
  title: string;
  lastInteractionTime: string;
  messageCount: number;
  createdAt: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rawResponse?: any;
}

export class ConversationService {
  static async getAgentConversations(agentId: string): Promise<Conversation[]> {
    try {
      const response = await httpService.get<{
        success: boolean;
        conversations: Conversation[];
      }>(`/daydreams/agents/${agentId}/memory/conversations`);

      return response.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  static async getConversationMessages(
    agentId: string,
    sessionId: string,
  ): Promise<ConversationMessage[]> {
    try {
      const response = await httpService.get<{
        success: boolean;
        messages: ConversationMessage[];
        agentId?: string;
        sessionId?: string;
        sessionInfo?: any;
      }>(
        `/daydreams/agents/${agentId}/memory/conversations/${sessionId}/messages`,
      );

      console.log('API Response:', response);
      console.log('Messages:', response.messages);

      return response.messages || [];
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  }
}
