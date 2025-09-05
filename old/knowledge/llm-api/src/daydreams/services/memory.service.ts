import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMemory, createMemory, createMemoryStore } from '@daydreamsai/core';
import { createChromaVectorStore } from '@daydreamsai/chromadb';
import { createSupabaseMemoryStore } from '../vendors/supabase';

@Injectable()
export class MemoryService {
  constructor(private configService: ConfigService) {}

  async initializeMemory(): Promise<BaseMemory> {
    let memoryType: string;
    try {
      memoryType =
        this.configService?.get<string>('MEMORY_TYPE') || 'in-memory';
    } catch (error) {
      console.warn(
        '[WARN] Failed to get MEMORY_TYPE from config, using in-memory:',
        error.message,
      );
      memoryType = 'in-memory';
    }

    // Check if ChromaDB should be used
    const useChroma = this.configService?.get<string>('USE_CHROMA') === 'true';
    const chromaUrl = this.configService?.get<string>('CHROMA_URL');

    try {
      if (memoryType === 'in-memory') {
        console.log('[INFO] Initializing in-memory store');
        const vectorStore = useChroma
          ? createChromaVectorStore('docs-context', chromaUrl)
          : null;
        return createMemory(createMemoryStore(), vectorStore);
      } else if (memoryType === 'supabase') {
        console.log('[INFO] Initializing Supabase memory store');
        const supabaseUrl = this.configService?.get<string>('SUPABASE_URL');
        const supabaseApiKey =
          this.configService?.get<string>('SUPABASE_API_KEY');
        const supabaseTable =
          this.configService?.get<string>('SUPABASE_TABLE') || 'conversations';

        if (!supabaseUrl || !supabaseApiKey) {
          throw new Error(
            'SUPABASE_URL or SUPABASE_API_KEY not set in environment',
          );
        }

        const supabaseStore = await createSupabaseMemoryStore({
          url: supabaseUrl,
          apiKey: supabaseApiKey,
          tableName: supabaseTable,
        });

        const vectorStore = useChroma
          ? createChromaVectorStore('docs-context', chromaUrl)
          : null;
        return createMemory(supabaseStore, vectorStore);
      } else if (memoryType === 'chroma') {
        console.log('[INFO] Initializing ChromaDB vector store');
        if (!useChroma) {
          throw new Error(
            'ChromaDB memory type selected but USE_CHROMA is false',
          );
        }

        const chromaUrl = this.configService?.get<string>('CHROMA_URL');

        if (!chromaUrl) {
          throw new Error(
            'CHROMA_URL not set in environment for ChromaDB memory store',
          );
        }

        const chromaStore = createChromaVectorStore('docs-context', chromaUrl);
        return createMemory(createMemoryStore(), chromaStore);
      } else {
        throw new Error(`Unsupported memory type: ${memoryType}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize memory:', error);
      throw error;
    }
  }
}
