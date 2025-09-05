import { Injectable, Logger } from '@nestjs/common';
import { Document } from '../entities/document.entity';
import { ChromaService } from './chroma.service';
import { SupabaseDocumentService } from './supabase-document.service';
import { ChunkingService } from './chunking.service';

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly chromaService: ChromaService,
    private readonly storageService: SupabaseDocumentService,
    private readonly chunkingService: ChunkingService,
  ) {}

  async indexDocument(document: Document): Promise<void> {
    try {
      // Save chunks to storage for persistence
      if (document.chunks && document.chunks.length > 0) {
        await this.storageService.saveChunks(document.id, document.chunks);
      }

      // Index in ChromaDB if enabled
      if (this.chromaService.isChromaEnabled()) {
        // Check document size to avoid token limit errors
        const estimatedTokens = this.chunkingService.estimateTokens(
          document.content,
        );

        // Lower threshold to 1000 tokens to ensure we stay well under OpenAI's limit
        if (estimatedTokens > 1000) {
          this.logger.log(
            `Document ${document.id} is large (${estimatedTokens} tokens est.), splitting into chunks for indexing...`,
          );

          // Split the document into smaller chunks
          const chunks = this.chunkingService.splitIntoChunks(
            document.content,
            {
              documentId: document.id,
              documentPath: document.path,
              ...document.metadata,
            },
          );

          this.logger.log(
            `Split document into ${chunks.length} chunks for indexing`,
          );

          // Prepare chunks with proper IDs for ChromaDB
          const documentChunks = chunks.map(chunk => ({
            id: `${document.id}_chunk_${chunk.chunkIndex}`,
            documentId: document.id,
            content: chunk.content,
            metadata: {
              ...chunk.metadata,
              originalDocumentId: document.id,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunk.totalChunks,
            },
          }));

          // Assign chunks to the document
          document.chunks = documentChunks;

          // Pass the complete document with chunks to ChromaDB
          await this.chromaService.indexDocument(document);

          this.logger.log(
            `Document ${document.id} indexed successfully in ${chunks.length} chunks`,
          );
        } else {
          // Small document, index as-is
          await this.chromaService.indexDocument(document);
          this.logger.log(`Document ${document.id} indexed successfully`);
        }
      } else {
        this.logger.warn(
          `ChromaDB disabled, document ${document.id} not indexed`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to index document ${document.id}:`);
      this.logger.error(error);
      // Don't throw for indexing errors - document is still saved
      // throw error;
    }
  }

  async reindexDocument(document: Document): Promise<void> {
    try {
      // Delete existing index entries
      if (this.chromaService.isChromaEnabled()) {
        await this.chromaService.deleteDocument(document.agentId, document.id);
      }

      // Re-index
      await this.indexDocument(document);
    } catch (error) {
      this.logger.error(`Failed to reindex document ${document.id}:`, error);
      throw error;
    }
  }

  async indexBatch(documents: Document[]): Promise<void> {
    const results = await Promise.allSettled(
      documents.map(doc => this.indexDocument(doc)),
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    const succeeded = results.filter(r => r.status === 'fulfilled').length;

    this.logger.log(
      `Batch indexing complete: ${succeeded} succeeded, ${failed} failed`,
    );
  }
}
