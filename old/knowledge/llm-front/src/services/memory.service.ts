import { Session, Message } from '../types/session';
import { httpService } from './http.service';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Service utilisant l'API sessions et la mémoire native de Daydreams
 * Cette approche combine la table sessions pour les métadonnées et Daydreams pour les messages
 */
export const MemoryService = {
  // Récupérer toutes les sessions pour un agent depuis la table sessions
  async getConversations(agentId: string): Promise<Session[]> {
    if (!agentId) {
      return [];
    }

    try {
      console.log(
        '🔍 [MemoryService.getConversations] Fetching sessions for agent:',
        agentId,
      );
      const data = (await httpService.get(
        `/daydreams/sessions/agent/${agentId}`,
      )) as { sessions?: any[] };

      console.log('📡 [MemoryService.getConversations] Raw API response:', {
        agentId,
        endpoint: `/daydreams/sessions/agent/${agentId}`,
        receivedSessions: data.sessions?.length || 0,
        rawSessions: data.sessions?.map((s) => ({
          id: s.id,
          name: s.name,
          agentId: s.agentId,
        })),
      });

      const mappedSessions = (data.sessions || []).map((session: any) => ({
        id: session.id,
        name: session.name,
        agentId: session.agentId,
        createdAt: new Date(session.createdAt).getTime(),
        updatedAt: session.updatedAt
          ? new Date(session.updatedAt).getTime()
          : undefined,
      }));

      // Validate that all sessions belong to the requested agent
      const invalidSessions = mappedSessions.filter(
        (session) => session.agentId !== agentId,
      );
      if (invalidSessions.length > 0) {
        console.error(
          '❌ [MemoryService.getConversations] API returned sessions for wrong agent:',
          {
            requestedAgentId: agentId,
            invalidSessions: invalidSessions.map((s) => ({
              id: s.id,
              agentId: s.agentId,
            })),
            totalReceived: mappedSessions.length,
            invalidCount: invalidSessions.length,
          },
        );
      }

      console.log('✅ [MemoryService.getConversations] Returning sessions:', {
        agentId,
        sessionsCount: mappedSessions.length,
        sessions: mappedSessions.map((s) => ({
          id: s.id,
          name: s.name,
          agentId: s.agentId,
        })),
      });

      return mappedSessions;
    } catch (error) {
      console.error(
        '❌ [MemoryService.getConversations] Error fetching sessions:',
        error,
      );
      return [];
    }
  },

  // Récupérer les messages d'une conversation depuis la mémoire Daydreams
  async getConversationMessages(
    agentId: string,
    sessionId: string,
  ): Promise<Message[]> {
    if (!agentId || !sessionId) {
      return [];
    }

    try {
      const data = (await httpService.get(
        `/daydreams/agents/${agentId}/memory/conversations/${sessionId}/messages`,
      )) as { messages?: any[] };
      return (data.messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        rawResponse: msg.rawResponse,
      }));
    } catch (error) {
      console.error('Error fetching conversation messages from memory:', error);
      return [];
    }
  },

  // Delete a session (sessions table + Daydreams memory)
  async deleteConversation(agentId: string, sessionId: string): Promise<void> {
    if (!agentId || !sessionId) {
      throw new Error('Agent ID and Session ID are required');
    }

    try {
      // First delete from sessions table
      try {
        await httpService.delete(`/daydreams/sessions/${sessionId}`);
      } catch (error) {
        console.warn('Failed to delete session from sessions table', error);
      }

      // Then delete from Daydreams memory
      try {
        await httpService.delete(
          `/daydreams/agents/${agentId}/memory/conversations/${sessionId}`,
        );
      } catch (error) {
        console.warn(
          'Failed to delete conversation from Daydreams memory',
          error,
        );
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // Create a new session in the sessions table
  async createSession(agentId: string, name?: string): Promise<Session> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    try {
      const data = (await httpService.post('/daydreams/sessions', {
        name: name || `New Session ${Date.now()}`,
        agentId: agentId,
      })) as { success: boolean; error?: string; session?: any };

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      return {
        id: data.session!.id,
        name: data.session!.name,
        agentId: data.session!.agentId,
        createdAt: new Date(data.session!.createdAt).getTime(),
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  // Mettre à jour le nom d'une session
  async updateSessionName(sessionId: string, name: string): Promise<Session> {
    if (!sessionId || !name) {
      throw new Error('Session ID and name are required');
    }

    try {
      const data = (await httpService.put(`/daydreams/sessions/${sessionId}`, {
        name: name,
      })) as { success: boolean; error?: string; session?: any };

      if (!data.success) {
        throw new Error(data.error || 'Failed to update session');
      }

      return {
        id: data.session!.id,
        name: data.session!.name,
        agentId: data.session!.agentId,
        createdAt: new Date(data.session!.createdAt).getTime(),
        updatedAt: data.session!.updatedAt
          ? new Date(data.session!.updatedAt).getTime()
          : undefined,
      };
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  // Obtenir les métadonnées d'une session spécifique
  async getSessionInfo(
    expectedAgentId: string,
    sessionId: string,
  ): Promise<Session | null> {
    try {
      console.log('🔍 [MemoryService.getSessionInfo] Fetching session info:', {
        expectedAgentId,
        sessionId,
        endpoint: `/daydreams/sessions/${sessionId}`,
      });

      const data = (await httpService.get(
        `/daydreams/sessions/${sessionId}`,
      )) as { success: boolean; session?: any };

      console.log('📡 [MemoryService.getSessionInfo] Raw API response:', {
        sessionId,
        success: data.success,
        session: data.session
          ? {
              id: data.session.id,
              name: data.session.name,
              agentId: data.session.agentId,
            }
          : null,
      });

      if (!data.success) {
        console.log(
          '❌ [MemoryService.getSessionInfo] API returned success: false',
        );
        return null;
      }

      const sessionInfo = {
        id: data.session!.id,
        name: data.session!.name,
        agentId: data.session!.agentId,
        createdAt: new Date(data.session!.createdAt).getTime(),
        updatedAt: data.session!.updatedAt
          ? new Date(data.session!.updatedAt).getTime()
          : undefined,
      };

      // Validate that session belongs to expected agent
      if (sessionInfo.agentId !== expectedAgentId) {
        console.error(
          '❌ [MemoryService.getSessionInfo] Session belongs to different agent:',
          {
            sessionId,
            expectedAgentId,
            actualAgentId: sessionInfo.agentId,
            sessionName: sessionInfo.name,
          },
        );
      } else {
        console.log(
          '✅ [MemoryService.getSessionInfo] Session validation passed:',
          {
            sessionId,
            agentId: sessionInfo.agentId,
            sessionName: sessionInfo.name,
          },
        );
      }

      return sessionInfo;
    } catch (error) {
      console.error(
        '❌ [MemoryService.getSessionInfo] Error fetching session info:',
        error,
      );
      return null;
    }
  },
};
