import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentConfig, CreateAgentDto, UpdateAgentDto } from '../types/agent';

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Debug all SUPABASE env vars
      this.logger.debug('All SUPABASE env vars:', {
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_API_KEY: process.env.SUPABASE_API_KEY ? 'SET' : 'NOT SET',
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY
          ? 'SET'
          : 'NOT SET',
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET
          ? 'SET'
          : 'NOT SET',
      });

      // Utiliser directement process.env car ConfigService ne fonctionne pas correctement avec ESM
      const supabaseUrl = process.env.SUPABASE_URL;
      // Use service key for backend operations to bypass RLS
      const supabaseKey =
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY;

      // Debug logging to verify which key is being used
      this.logger.debug('Environment keys available:', {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasApiKey: !!process.env.SUPABASE_API_KEY,
        serviceKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0,
        apiKeyLength: process.env.SUPABASE_API_KEY?.length || 0,
      });

      this.logger.debug('Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseKey?.length || 0,
        keyType: process.env.SUPABASE_SERVICE_KEY ? 'SERVICE_KEY' : 'API_KEY',
        keyPrefix: supabaseKey?.substring(0, 50) + '...',
      });

      if (!supabaseUrl || !supabaseKey) {
        this.logger.warn(
          'Supabase configuration missing. Storage will not be available.',
        );
        this.isConnected = false;
        return;
      }

      this.logger.debug('Creating Supabase client...');

      // If using service key, we need to bypass RLS
      const isServiceKey =
        !!process.env.SUPABASE_SERVICE_KEY &&
        supabaseKey === process.env.SUPABASE_SERVICE_KEY;

      if (isServiceKey) {
        this.logger.debug(
          'Creating Supabase client with SERVICE KEY (bypasses RLS)',
        );
        // Service role key should bypass RLS
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        });
        this.logger.debug('Service client created with explicit headers');
      } else {
        this.logger.debug(
          'Creating Supabase client with ANON KEY (subject to RLS)',
        );
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }

      // Set connected state since client is created
      this.isConnected = true;
      this.logger.debug('Supabase client created successfully');

      // Test connection by checking if we can query the agents table
      this.logger.debug('Testing Supabase connection...');

      // Extra debug: let's check the actual JWT payload to see the role
      if (supabaseKey) {
        try {
          const parts = supabaseKey.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64').toString(),
            );
            this.logger.debug('JWT Token payload:', {
              role: payload.role,
              iss: payload.iss,
              ref: payload.ref,
            });
          }
        } catch (e) {
          this.logger.debug('Could not decode JWT token');
        }
      }

      const { data, error } = await this.supabase
        .from('agents')
        .select('id')
        .limit(1);

      if (error) {
        this.logger.error('Supabase query error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        // Don't throw on table not found or permission errors, just log warning
        if (
          error.code === 'PGRST116' ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn(
            'Table "agents" does not exist - you may need to run the migrations in /supabase/migrations/',
          );
        } else if (
          error.code === '42501' ||
          error.message.includes('permission denied')
        ) {
          this.logger.warn(
            'Permission denied for table "agents" - you may need to check your Supabase RLS policies or use a service role key',
          );
        } else {
          // For other errors, mark as disconnected and throw
          this.isConnected = false;
          throw error;
        }
      } else {
        this.logger.debug('Successfully queried agents table:', { data });
      }

      this.logger.log('Supabase connection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      this.isConnected = false;
      // Don't re-throw in onModuleInit to avoid UnhandledPromiseRejection
      // The service will simply not be available if connection fails
    }
  }

  private async ensureConnection() {
    if (!this.isConnected) {
      throw new Error('Supabase connection is not available');
    }
  }

  getClient(): SupabaseClient {
    if (!this.isConnected) {
      throw new Error('Supabase connection is not available');
    }
    return this.supabase;
  }

  async createAgent(config: AgentConfig): Promise<AgentConfig> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .insert([
          {
            id: config.id,
            model_type: config.modelType,
            model_id: config.modelId,
            name: config.name,
            description: config.description,
            instructions: config.instructions,
            contexts: config.contexts,
            context_args: config.contextArgs,
            status: config.status,
            capabilities: config.capabilities,
            stats: config.stats,
            user_id: (config as any).userId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return this.mapToAgentConfig(data);
    } catch (error) {
      this.logger.error(`Failed to create agent: ${error.message}`, error);
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  async findAgentById(id: string): Promise<AgentConfig | null> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? this.mapToAgentConfig(data) : null;
    } catch (error) {
      this.logger.error(`Failed to find agent ${id}: ${error.message}`, error);
      throw new Error(`Failed to find agent ${id}: ${error.message}`);
    }
  }

  async findAllAgents(): Promise<AgentConfig[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase.from('agents').select('*');

      if (error) throw error;
      return data.map(this.mapToAgentConfig);
    } catch (error) {
      this.logger.error(`Failed to find agents: ${error.message}`, error);
      throw new Error(`Failed to find agents: ${error.message}`);
    }
  }

  async findAgentsByUserId(userId: string): Promise<AgentConfig[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(this.mapToAgentConfig);
    } catch (error) {
      this.logger.error(
        `Failed to find agents for user ${userId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to find agents for user ${userId}: ${error.message}`,
      );
    }
  }

  async updateAgent(
    id: string,
    updateDto: Partial<AgentConfig>,
  ): Promise<AgentConfig | null> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .update({
          ...this.mapToSupabaseFormat(updateDto),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToAgentConfig(data) : null;
    } catch (error) {
      this.logger.error(
        `Failed to update agent ${id}: ${error.message}`,
        error,
      );
      throw new Error(`Failed to update agent ${id}: ${error.message}`);
    }
  }

  async deleteAgent(id: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const { error } = await this.supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete agent ${id}: ${error.message}`,
        error,
      );
      throw new Error(`Failed to delete agent ${id}: ${error.message}`);
    }
  }

  async findActiveAgents(): Promise<AgentConfig[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data.map(this.mapToAgentConfig);
    } catch (error) {
      this.logger.error(
        `Failed to find active agents: ${error.message}`,
        error,
      );
      throw new Error(`Failed to find active agents: ${error.message}`);
    }
  }

  async updateAgentStats(
    id: string,
    stats: {
      totalConversations?: number;
      averageResponseTime?: number;
      successRate?: number;
      lastActive?: string;
    },
  ): Promise<AgentConfig | null> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('agents')
        .update({
          stats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToAgentConfig(data) : null;
    } catch (error) {
      this.logger.error(
        `Failed to update agent stats ${id}: ${error.message}`,
        error,
      );
      throw new Error(`Failed to update agent stats ${id}: ${error.message}`);
    }
  }

  private mapToAgentConfig(data: any): AgentConfig {
    const config: AgentConfig = {
      id: data.id,
      modelType: data.model_type,
      modelId: data.model_id,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      contexts: data.contexts,
      contextArgs: data.context_args,
      status: data.status,
      capabilities: data.capabilities,
      stats: data.stats,
    };

    // Include userId if present
    if (data.user_id) {
      (config as any).userId = data.user_id;
    }

    return config;
  }

  private mapToSupabaseFormat(config: Partial<AgentConfig>): any {
    const mapped: any = {};
    if (config.modelType) mapped.model_type = config.modelType;
    if (config.modelId) mapped.model_id = config.modelId;
    if (config.name) mapped.name = config.name;
    if (config.description) mapped.description = config.description;
    if (config.instructions) mapped.instructions = config.instructions;
    if (config.contexts) mapped.contexts = config.contexts;
    if (config.contextArgs) mapped.context_args = config.contextArgs;
    if (config.status) mapped.status = config.status;
    if (config.capabilities) mapped.capabilities = config.capabilities;
    if (config.stats) mapped.stats = config.stats;
    if ((config as any).userId) mapped.user_id = (config as any).userId;
    return mapped;
  }

  // === DEPRECATED METHODS - KEPT FOR FALLBACK ===
  // These methods are now only used as fallback
  // The main system uses native Daydreams memory

  // Session management methods (DEPRECATED - fallback only)
  async createSession(session: {
    id: string;
    agentId: string;
    name: string;
    userId?: string;
  }): Promise<any> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('sessions')
        .insert([
          {
            id: session.id,
            agent_id: session.agentId,
            name: session.name,
            user_id: session.userId || 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
            tags: [],
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`, error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async findSessionsByAgentId(agentId: string): Promise<any[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error(
        `Failed to find sessions for agent ${agentId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to find sessions for agent ${agentId}: ${error.message}`,
      );
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.ensureConnection();

      // Delete messages first
      const { error: messagesError } = await this.supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) throw messagesError;

      // Then delete session
      const { error: sessionError } = await this.supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;
    } catch (error) {
      this.logger.error(
        `Failed to delete session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to delete session ${sessionId}: ${error.message}`,
      );
    }
  }

  // Message management methods
  async saveMessage(message: {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    rawResponse?: any;
  }): Promise<any> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('messages')
        .insert([
          {
            id: message.id,
            session_id: message.sessionId,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            raw_response: message.rawResponse,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update session's updated_at timestamp
      await this.supabase
        .from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', message.sessionId);

      return data;
    } catch (error) {
      this.logger.error(`Failed to save message: ${error.message}`, error);
      throw new Error(`Failed to save message: ${error.message}`);
    }
  }

  async findMessagesBySessionId(sessionId: string): Promise<any[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error(
        `Failed to find messages for session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to find messages for session ${sessionId}: ${error.message}`,
      );
    }
  }

  // Methods to use the conversations table as a source for sessions/messages

  /**
   * Extract all chat sessions from the conversations table
   * Search for keys that start with "chat:" and extract metadata
   */
  async findChatSessionsFromConversations(agentId?: string): Promise<any[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('conversations')
        .select('key, value, updated_at')
        .like('key', 'chat:%');

      if (error) throw error;

      let sessions = (data || []).map(row => {
        const sessionId = row.key.replace('chat:', '');
        const memory = row.value;

        return {
          id: sessionId,
          name: memory.title || `Session ${sessionId}`,
          agentId: memory.agentId || 'unknown',
          userId: 'user', // Could be extracted from data
          createdAt: new Date(memory.createdAt || row.updated_at).getTime(),
          updatedAt: new Date(
            memory.lastInteractionTime || row.updated_at,
          ).getTime(),
          isActive: memory.isActive !== false,
          tags: memory.tags || [],
          messageCount:
            memory.messageCount || memory.messageHistory?.length || 0,
        };
      });

      // Filter by agentId if provided
      if (agentId) {
        // Only include sessions that have this specific agentId (exclude "unknown" or missing agentId)
        sessions = sessions.filter(
          session =>
            session.agentId === agentId && session.agentId !== 'unknown',
        );
      }

      // Sort by last activity
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);

      return sessions;
    } catch (error) {
      this.logger.error(
        `Failed to find chat sessions from conversations: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to find chat sessions from conversations: ${error.message}`,
      );
    }
  }

  /**
   * Extract messages from a session from the conversations table
   */
  async findMessagesFromConversations(sessionId: string): Promise<any[]> {
    try {
      await this.ensureConnection();
      const { data, error } = await this.supabase
        .from('conversations')
        .select('value')
        .eq('key', `chat:${sessionId}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Session not found
          return [];
        }
        throw error;
      }

      const memory = data.value;
      const messageHistory = memory.messageHistory || [];

      // Convertir au format attendu par l'UI
      return messageHistory.map((msg: any, index: number) => ({
        id: `msg-${sessionId}-${index}`,
        sessionId: sessionId,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp,
        created_at: new Date(msg.timestamp).toISOString(),
        rawResponse: msg.rawResponse || null,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find messages for session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to find messages for session ${sessionId}: ${error.message}`,
      );
    }
  }

  /**
   * Create or update a session in the conversations table
   */
  async upsertChatSession(
    sessionId: string,
    data: {
      title?: string;
      tags?: string[];
      agentId?: string;
      userId?: string;
    },
  ): Promise<any> {
    try {
      await this.ensureConnection();
      const key = `chat:${sessionId}`;

      // Retrieve existing session or create a new one
      const { data: existing } = await this.supabase
        .from('conversations')
        .select('value')
        .eq('key', key)
        .single();

      const existingMemory = existing?.value || {};

      const memory = {
        messageHistory: existingMemory.messageHistory || [],
        userPreferences: existingMemory.userPreferences || {},
        lastInteractionTime: Date.now(),
        title: data.title || existingMemory.title || `Session ${sessionId}`,
        tags: data.tags || existingMemory.tags || [],
        isActive: true,
        messageCount: existingMemory.messageCount || 0,
        createdAt: existingMemory.createdAt || Date.now(),
      };

      const { data: result, error } = await this.supabase
        .from('conversations')
        .upsert(
          {
            key,
            value: memory,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          },
        )
        .select()
        .single();

      if (error) throw error;

      return {
        id: sessionId,
        name: memory.title,
        agentId: data.agentId || 'unknown',
        userId: data.userId || 'user',
        createdAt: memory.createdAt,
        updatedAt: memory.lastInteractionTime,
        isActive: memory.isActive,
        tags: memory.tags,
        messageCount: memory.messageCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upsert chat session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to upsert chat session ${sessionId}: ${error.message}`,
      );
    }
  }

  /**
   * Add a message to a session in the conversations table
   */
  async addMessageToConversation(
    sessionId: string,
    message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: number;
      rawResponse?: any;
    },
    agentId?: string,
  ): Promise<any> {
    try {
      await this.ensureConnection();
      const key = `chat:${sessionId}`;

      // Retrieve existing session
      const { data: existing, error: getError } = await this.supabase
        .from('conversations')
        .select('value')
        .eq('key', key)
        .single();

      if (getError && getError.code !== 'PGRST116') {
        throw getError;
      }

      const memory = existing?.value || {
        messageHistory: [],
        userPreferences: {},
        lastInteractionTime: Date.now(),
        title: `Session ${sessionId}`,
        tags: [],
        isActive: true,
        messageCount: 0,
        createdAt: Date.now(),
        agentId: agentId || 'unknown',
      };

      // Update agentId if provided
      if (agentId) {
        memory.agentId = agentId;
      }

      // Add the new message
      const newMessage = {
        sender: message.role === 'user' ? 'user' : 'agent',
        text: message.content,
        timestamp: message.timestamp || Date.now(),
        rawResponse: message.rawResponse,
      };

      memory.messageHistory = memory.messageHistory || [];
      memory.messageHistory.push(newMessage);
      memory.messageCount = memory.messageHistory.length;
      memory.lastInteractionTime = Date.now();

      // Save the updated session
      const { data: result, error: updateError } = await this.supabase
        .from('conversations')
        .upsert(
          {
            key,
            value: memory,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          },
        )
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        id: `msg-${sessionId}-${memory.messageHistory.length - 1}`,
        sessionId: sessionId,
        role: message.role,
        content: message.content,
        timestamp: newMessage.timestamp,
        created_at: new Date(newMessage.timestamp).toISOString(),
        rawResponse: message.rawResponse,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add message to session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to add message to session ${sessionId}: ${error.message}`,
      );
    }
  }

  /**
   * Delete a chat session from the conversations table
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await this.ensureConnection();
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('key', `chat:${sessionId}`);

      if (error) throw error;
    } catch (error) {
      this.logger.error(
        `Failed to delete chat session ${sessionId}: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to delete chat session ${sessionId}: ${error.message}`,
      );
    }
  }
}
