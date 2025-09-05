import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentChunk } from '../entities/document.entity';
import * as crypto from 'crypto';

@Injectable()
export class SupabaseDocumentService {
  private readonly logger = new Logger(SupabaseDocumentService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.logger.log(
      'SupabaseDocumentService initialized with service role key',
    );
  }

  async saveDocument(document: Document): Promise<void> {
    try {
      const { error } = await this.supabase.from('documents').upsert({
        id: document.id,
        agent_id: document.agentId,
        path: document.path,
        content: document.content,
        type: document.type,
        metadata: document.metadata,
        chunks: document.chunks || [],
        indexed: document.indexed || false,
        indexed_at: document.indexedAt,
        size: document.size,
        hash: document.hash,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      this.logger.log(
        `Document saved: ${document.id} for agent ${document.agentId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to save document ${document.id}:`, error);
      throw error;
    }
  }

  async loadDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return this.mapToDocument(data);
    } catch (error) {
      this.logger.error(`Failed to load document ${id}:`, error);
      throw error;
    }
  }

  async loadDocumentByPath(
    agentId: string,
    path: string,
  ): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('agent_id', agentId)
        .eq('path', path)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return this.mapToDocument(data);
    } catch (error) {
      this.logger.error(`Failed to load document by path ${path}:`, error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      this.logger.log(`Document deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async listDocuments(filters?: {
    agentId?: string;
    collection?: string;
    type?: string;
  }): Promise<Document[]> {
    try {
      let query = this.supabase.from('documents').select('*');

      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      if (filters?.collection) {
        query = query.eq('metadata->>collection', filters.collection);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(row => this.mapToDocument(row));
    } catch (error) {
      this.logger.error('Failed to list documents:', error);
      return [];
    }
  }

  async fileExists(agentId: string, path: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('path', path);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      this.logger.error('Failed to check file existence:', error);
      return false;
    }
  }

  calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private mapToDocument(row: any): Document {
    return {
      id: row.id,
      agentId: row.agent_id,
      path: row.path,
      content: row.content,
      type: row.type,
      metadata: row.metadata || {},
      chunks: row.chunks || [],
      indexed: row.indexed,
      indexedAt: row.indexed_at ? new Date(row.indexed_at) : undefined,
      size: row.size,
      hash: row.hash,
    };
  }

  // These methods are no longer needed for chunks as they're stored in the document
  async saveChunks(documentId: string, chunks: DocumentChunk[]): Promise<void> {
    // Chunks are now saved with the document
    this.logger.log(`Chunks are saved with the document ${documentId}`);
  }

  async loadChunks(documentId: string): Promise<DocumentChunk[]> {
    const document = await this.loadDocument(documentId);
    return document?.chunks || [];
  }
}
