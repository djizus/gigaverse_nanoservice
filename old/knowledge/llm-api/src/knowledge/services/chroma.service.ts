import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { Document, DocumentChunk } from '../entities/document.entity';

@Injectable()
export class ChromaService implements OnModuleInit {
  private readonly logger = new Logger(ChromaService.name);
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();
  private embedder: OpenAIEmbeddingFunction;
  private isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get('USE_CHROMA') !== 'false';
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn('ChromaDB is disabled');
      return;
    }

    try {
      await this.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB:', error);
      this.isEnabled = false;
    }
  }

  private async initialize() {
    const chromaUrl =
      this.configService.get('CHROMA_URL') || 'http://localhost:8000';
    const openaiApiKey = this.configService.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for ChromaDB embeddings');
    }

    this.client = new ChromaClient({ path: chromaUrl });

    this.embedder = new OpenAIEmbeddingFunction({
      openai_api_key: openaiApiKey,
      openai_model: 'text-embedding-3-small',
    });

    this.logger.log('ChromaDB initialized successfully');
  }

  private async getAgentCollection(agentId: string): Promise<Collection> {
    if (!this.isEnabled) {
      return null;
    }

    const collectionName = `knowledge-agent-${agentId}`;

    if (this.collections.has(agentId)) {
      return this.collections.get(agentId);
    }

    try {
      const collection = await this.client.getOrCreateCollection({
        name: collectionName,
        embeddingFunction: this.embedder,
        metadata: {
          'hnsw:space': 'cosine',
          agent_id: agentId,
        },
      });

      this.collections.set(agentId, collection);
      this.logger.log(`Collection created/loaded for agent ${agentId}`);
      return collection;
    } catch (error) {
      this.logger.error(
        `Failed to get/create collection for agent ${agentId}:`,
        error,
      );
      throw error;
    }
  }

  async indexDocument(document: Document): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const collection = await this.getAgentCollection(document.agentId);
    if (!collection) {
      return;
    }

    try {
      // Handle single document indexing (when the document itself is passed, not chunks)
      if (!document.chunks || document.chunks.length === 0) {
        // Index as a single document
        // Prepare metadata - ChromaDB only accepts primitive types
        const { tags, ...restMetadata } = document.metadata || {};
        const documentMetadata = {
          documentId: document.id,
          documentPath: document.path,
          documentType: document.type,
          documentTitle: document.metadata?.title || '',
          documentCollection: document.metadata?.collection || '',
          documentTags: tags?.join(',') || '',
          agentId: document.agentId,
          // Only include primitive values from metadata
          ...Object.entries(restMetadata).reduce(
            (acc, [key, value]) => {
              if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string | number | boolean>,
          ),
        };

        await collection.add({
          ids: [document.id],
          documents: [document.content],
          metadatas: [documentMetadata],
        });

        this.logger.log(
          `Indexed document ${document.id} for agent ${document.agentId}`,
        );
        return;
      }

      // Handle chunked document indexing with batching
      const BATCH_SIZE = 10; // Process 10 chunks at a time to avoid token limits
      let indexedCount = 0;

      for (let i = 0; i < document.chunks.length; i += BATCH_SIZE) {
        const batchChunks = document.chunks.slice(i, i + BATCH_SIZE);

        const ids = batchChunks.map(chunk => chunk.id);
        const documents = batchChunks.map(chunk => chunk.content);
        const metadatas = batchChunks.map(chunk => {
          // Prepare metadata - ChromaDB only accepts primitive types
          const { tags: docTags, ...restDocMetadata } = document.metadata || {};
          const { tags: chunkTags, ...restChunkMetadata } =
            chunk.metadata || {};

          return {
            documentId: document.id,
            documentPath: document.path,
            documentType: document.type,
            documentTitle: document.metadata?.title || '',
            documentCollection: document.metadata?.collection || '',
            documentTags: docTags?.join(',') || '',
            agentId: document.agentId,
            // Only include primitive values from chunk metadata
            ...Object.entries({
              ...restDocMetadata,
              ...restChunkMetadata,
            }).reduce(
              (acc, [key, value]) => {
                if (
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'
                ) {
                  acc[key] = value;
                }
                return acc;
              },
              {} as Record<string, string | number | boolean>,
            ),
          };
        });

        try {
          await collection.add({
            ids,
            documents,
            metadatas,
          });

          indexedCount += batchChunks.length;
          this.logger.debug(
            `Indexed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(document.chunks.length / BATCH_SIZE)} (${batchChunks.length} chunks)`,
          );
        } catch (batchError) {
          this.logger.error(
            `Failed to index batch starting at chunk ${i}:`,
            batchError,
          );
          // Continue with next batch even if one fails
        }
      }

      this.logger.log(
        `Successfully indexed ${indexedCount}/${document.chunks.length} chunks for document ${document.id} in agent ${document.agentId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to index document ${document.id}:`, error);
      throw error;
    }
  }

  async deleteDocument(agentId: string, documentId: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const collection = await this.getAgentCollection(agentId);
    if (!collection) {
      return;
    }

    try {
      // Get all chunk IDs for this document
      const results = await collection.get({
        where: { documentId },
      });

      if (results.ids.length > 0) {
        await collection.delete({
          ids: results.ids,
        });
        this.logger.log(
          `Deleted ${results.ids.length} chunks for document ${documentId} from agent ${agentId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete document ${documentId} from index:`,
        error,
      );
      throw error;
    }
  }

  async query(
    agentId: string,
    queryText: string,
    limit: number = 10,
    filters?: Record<string, any>,
  ): Promise<any[]> {
    if (!this.isEnabled) {
      return [];
    }

    const collection = await this.getAgentCollection(agentId);
    if (!collection) {
      return [];
    }

    try {
      const where: Record<string, any> = {};

      if (filters?.collection) {
        where.documentCollection = filters.collection;
      }
      if (filters?.type) {
        where.documentType = filters.type;
      }
      if (filters?.tags && filters.tags.length > 0) {
        // ChromaDB doesn't support array contains, so we use a workaround
        where.$or = filters.tags.map((tag: string) => ({
          documentTags: { $contains: tag },
        }));
      }

      const results = await collection.query({
        queryTexts: [queryText],
        nResults: limit,
        where: Object.keys(where).length > 0 ? where : undefined,
      });

      if (!results.documents[0] || results.documents[0].length === 0) {
        return [];
      }

      return results.documents[0].map((doc, index) => ({
        id: results.ids[0][index],
        text: doc,
        metadata: results.metadatas[0][index],
        distance: results.distances ? results.distances[0][index] : 0,
        score: results.distances ? 1 - results.distances[0][index] : 1,
      }));
    } catch (error) {
      this.logger.error('Failed to query ChromaDB:', error);
      return [];
    }
  }

  async upsertChunks(
    agentId: string,
    chunks: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
    }>,
  ): Promise<void> {
    if (!this.isEnabled || chunks.length === 0) {
      return;
    }

    const collection = await this.getAgentCollection(agentId);
    if (!collection) {
      return;
    }

    try {
      const ids = chunks.map(chunk => chunk.id);
      const documents = chunks.map(chunk => chunk.content);
      const metadatas = chunks.map(chunk => ({ ...chunk.metadata, agentId }));

      await collection.upsert({
        ids,
        documents,
        metadatas,
      });

      this.logger.log(`Upserted ${chunks.length} chunks for agent ${agentId}`);
    } catch (error) {
      this.logger.error('Failed to upsert chunks:', error);
      throw error;
    }
  }

  async getCollectionInfo(agentId: string): Promise<any> {
    if (!this.isEnabled) {
      return { enabled: false };
    }

    const collection = await this.getAgentCollection(agentId);
    if (!collection) {
      return { enabled: false, error: 'Collection not found' };
    }

    try {
      const count = await collection.count();
      return {
        enabled: true,
        name: `knowledge-agent-${agentId}`,
        agentId,
        count,
        embeddingModel: 'text-embedding-3-small',
      };
    } catch (error) {
      this.logger.error('Failed to get collection info:', error);
      return { enabled: false, error: error.message };
    }
  }

  async listAgentCollections(): Promise<string[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const collections = await this.client.listCollections();
      return collections
        .filter(col => (col as any).name?.startsWith('knowledge-agent-'))
        .map(col => (col as any).name.replace('knowledge-agent-', ''));
    } catch (error) {
      this.logger.error('Failed to list agent collections:', error);
      return [];
    }
  }

  isChromaEnabled(): boolean {
    return this.isEnabled;
  }
}
