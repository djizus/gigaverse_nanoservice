import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DaydreamsStorage } from './storage.interface';
import { AgentConfig, CreateAgentInput, UpdateAgentInput } from '../types/agent';
import { Message, Session } from '../types/session';
import { SupabaseConfig } from '../../infrastructure/config/env.config';

/**
 * Minimal Supabase-backed storage for Daydreams PoC.
 * Requires database tables defined in database/daydreams.schema.sql
 */
export class SupabaseStorage implements DaydreamsStorage {
  private supabase: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey);
  }

  // Agents
  async listAgents(): Promise<AgentConfig[]> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    console.log(`[Daydreams][Storage] listAgents count=${data?.length ?? 0}`);
    return (data || []).map(mapAgentFromRow);
  }

  async createAgent(input: CreateAgentInput): Promise<AgentConfig> {
    const { data, error } = await this.supabase
      .from('agents')
      .insert([{
        name: input.name,
        description: input.description ?? null,
        model: input.model,
        model_type: input.modelType ?? null,
        context: input.context,
        contexts: input.contexts ?? null,
        context_args: input.contextArgs ?? null,
        mcp_config: input.mcpConfig ?? null,
        instructions: input.instructions ?? null,
        status: input.status ?? 'active',
      }])
      .select('*')
      .single();
    if (error) throw error;
    console.log(`[Daydreams][Storage] createAgent id=${data?.id}`);
    return mapAgentFromRow(data);
  }

  async getAgent(id: string): Promise<AgentConfig | null> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    console.log(`[Daydreams][Storage] getAgent id=${data?.id ?? null}`);
    return data ? mapAgentFromRow(data) : null;
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<AgentConfig | null> {
    const { data, error } = await this.supabase
      .from('agents')
      .update({
        ...input,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    console.log(`[Daydreams][Storage] updateAgent id=${data?.id ?? null}`);
    return data ? mapAgentFromRow(data) : null;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', id);
    if (error) throw error;
    console.log(`[Daydreams][Storage] deleteAgent id=${id} ok=true`);
    return true;
  }

  // Sessions
  async createSession(agentId: string, title?: string, opts?: { daydreamsKey?: string; name?: string }): Promise<Session> {
    const payload: any = { agent_id: agentId, title: title ?? null };
    if (opts?.name) payload.name = opts.name;
    if (opts?.daydreamsKey) payload.daydreams_key = opts.daydreamsKey;
    const { data, error } = await this.supabase
      .from('sessions')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    console.log(`[Daydreams][Storage] createSession id=${data?.id}`);
    return mapSessionFromRow(data);
  }

  async getSession(id: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    console.log(`[Daydreams][Storage] getSession id=${data?.id ?? null}`);
    return data ? mapSessionFromRow(data) : null;
  }

  async listAgentSessions(agentId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    console.log(`[Daydreams][Storage] listAgentSessions agentId=${agentId} count=${data?.length ?? 0}`);
    return (data || []).map(mapSessionFromRow);
  }

  // Messages
  async addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert([{ 
        session_id: message.sessionId, 
        agent_id: message.agentId, 
        role: message.role, 
        content: message.content 
      }])
      .select('*')
      .single();
    if (error) throw error;
    console.log(`[Daydreams][Storage] addMessage id=${data?.id} role=${data?.role}`);
    return mapMessageFromRow(data);
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    console.log(`[Daydreams][Storage] listMessages sessionId=${sessionId} count=${data?.length ?? 0}`);
    return (data || []).map(mapMessageFromRow);
  }

  // Templates
  async getTemplateById(id: string) {
    const { data, error } = await this.supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      model: data.model ?? undefined,
      context: data.context ?? undefined,
      instructions: data.instructions ?? undefined,
      variables: data.variables ?? undefined,
      tags: data.tags ?? undefined,
    } : null;
  }
}

// Row mappers
function mapAgentFromRow(row: any): AgentConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    model: row.model,
    modelType: row.model_type ?? undefined,
    context: row.context,
    contexts: row.contexts ?? undefined,
    contextArgs: row.context_args ?? undefined,
    mcpConfig: row.mcp_config ?? undefined,
    capabilities: row.capabilities ?? undefined,
    stats: row.stats ?? undefined,
    instructions: row.instructions ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionFromRow(row: any): Session {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageFromRow(row: any): Message {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentId: row.agent_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}
