import { Injectable, Logger } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { v4 as uuidv4 } from 'uuid';

export interface SessionDto {
  id: string;
  name: string;
  agentId: string;
  userId?: string;
  daydreamsKey: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSessionDto {
  name: string;
  agentId: string;
  userId?: string;
}

export interface UpdateSessionDto {
  name?: string;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly supabaseStorage: SupabaseStorageService) {}

  /**
   * Create a new session entry
   */
  async createSession(createSessionDto: CreateSessionDto): Promise<SessionDto> {
    try {
      // Generate session ID as UUID v4
      const sessionId = uuidv4();
      const daydreamsKey = `chat:${sessionId}`;

      const sessionData = {
        id: sessionId,
        name: createSessionDto.name,
        agent_id: createSessionDto.agentId,
        user_id: createSessionDto.userId || 'user',
        daydreams_key: daydreamsKey,
      };

      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating session:', error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      return this.formatSessionData(data);
    } catch (error) {
      this.logger.error('Error in createSession:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for an agent
   */
  async getSessionsByAgent(
    agentId: string,
    userId: string = 'user',
  ): Promise<SessionDto[]> {
    try {
      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching sessions:', error);
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      return (data || []).map(this.formatSessionData);
    } catch (error) {
      this.logger.error('Error in getSessionsByAgent:', error);
      throw error;
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(sessionId: string): Promise<SessionDto | null> {
    try {
      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        this.logger.error('Error fetching session:', error);
        throw new Error(`Failed to fetch session: ${error.message}`);
      }

      return this.formatSessionData(data);
    } catch (error) {
      this.logger.error('Error in getSessionById:', error);
      throw error;
    }
  }

  /**
   * Update a session
   */
  async updateSession(
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionDto> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateSessionDto.name) {
        updateData.name = updateSessionDto.name;
      }

      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating session:', error);
        throw new Error(`Failed to update session: ${error.message}`);
      }

      return this.formatSessionData(data);
    } catch (error) {
      this.logger.error('Error in updateSession:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        this.logger.error('Error deleting session:', error);
        throw new Error(`Failed to delete session: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error in deleteSession:', error);
      throw error;
    }
  }

  /**
   * Find session by Daydreams key
   */
  async getSessionByDaydreamsKey(
    daydreamsKey: string,
  ): Promise<SessionDto | null> {
    try {
      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .select('*')
        .eq('daydreams_key', daydreamsKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        this.logger.error('Error fetching session by Daydreams key:', error);
        throw new Error(`Failed to fetch session: ${error.message}`);
      }

      return this.formatSessionData(data);
    } catch (error) {
      this.logger.error('Error in getSessionByDaydreamsKey:', error);
      throw error;
    }
  }

  /**
   * Verify agent ownership
   */
  async verifyAgentOwnership(
    agentId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const agent = await this.supabaseStorage.findAgentById(agentId);
      if (!agent) {
        return false;
      }
      return (agent as any).userId === userId;
    } catch (error) {
      this.logger.error('Error verifying agent ownership:', error);
      return false;
    }
  }

  /**
   * Verify session ownership
   */
  async verifySessionOwnership(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseStorage
        .getClient()
        .from('sessions')
        .select('user_id, agent_id')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if the user owns the session
      if (data.user_id === userId) {
        return true;
      }

      // Also check if the user owns the agent
      return this.verifyAgentOwnership(data.agent_id, userId);
    } catch (error) {
      this.logger.error('Error verifying session ownership:', error);
      return false;
    }
  }

  /**
   * Format database row to SessionDto
   */
  private formatSessionData(data: any): SessionDto {
    return {
      id: data.id,
      name: data.name,
      agentId: data.agent_id,
      userId: data.user_id,
      daydreamsKey: data.daydreams_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
