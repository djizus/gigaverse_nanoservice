import { Agent, CreateAgentDto } from '@/types/agent';
import { httpService } from './http.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class AgentService {
  static async getAgents(): Promise<Agent[]> {
    try {
      const data = await httpService.get<{ agents: Agent[] }>(
        '/daydreams/agents',
      );
      return data.agents || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }

  static async getAgent(agentId: string): Promise<Agent | null> {
    try {
      const data = await httpService.get<{ agent: Agent }>(
        `/daydreams/agents/${agentId}`,
      );
      return data.agent || null;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }

  static async createAgent(agentData: CreateAgentDto): Promise<Agent | null> {
    try {
      const data = await httpService.post<{ agent: Agent }>(
        '/daydreams/agents',
        agentData,
      );
      return data.agent || null;
    } catch (error) {
      console.error('Error creating agent:', error);
      return null;
    }
  }

  static async updateAgent(agentId: string, agentData: Partial<CreateAgentDto>): Promise<Agent | null> {
    try {
      const data = await httpService.put<{ agent: Agent }>(
        `/daydreams/agents/${agentId}`,
        agentData,
      );
      return data.agent || null;
    } catch (error) {
      console.error('Error updating agent:', error);
      return null;
    }
  }

  static async deleteAgent(agentId: string): Promise<boolean> {
    try {
      await httpService.delete(`/daydreams/agents/${agentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  }

  static async sendMessage(
    agentId: string,
    message: string,
    sessionId?: string,
  ): Promise<any> {
    try {
      const data = await httpService.post(
        `/daydreams/agents/${agentId}/send`,
        {
          content: message, // Changed from 'message' to 'content' to match DTO
          sessionId,
          contextId: 'chat', // Adding default contextId
          userId: 'user', // Adding default userId
        },
      );
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  static async streamMessage(
    agentId: string,
    message: string,
    sessionId?: string,
  ): Promise<ReadableStream | null> {
    try {
      const token = httpService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_URL}/daydreams/agents/${agentId}/stream`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: message, // Changed from 'message' to 'content' to match DTO
            sessionId,
            contextId: 'chat', // Adding default contextId
            userId: 'user', // Adding default userId
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      console.error('Error streaming message:', error);
      return null;
    }
  }
}
