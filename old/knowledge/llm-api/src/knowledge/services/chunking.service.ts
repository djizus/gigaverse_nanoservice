import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly MAX_CHUNK_SIZE = 1500; // Characters per chunk for text (~375 tokens)
  private readonly MAX_JSON_CHUNK_SIZE = 3000; // Characters per chunk for JSON (~750 tokens)
  private readonly CHUNK_OVERLAP = 200; // Overlap between chunks
  private readonly MAX_TOKENS_PER_CHUNK = 1000; // Very safe limit to avoid OpenAI errors

  /**
   * Split large content into smaller chunks for indexing
   */
  splitIntoChunks(
    content: string,
    metadata: any = {},
  ): Array<{
    content: string;
    metadata: any;
    chunkIndex: number;
    totalChunks: number;
  }> {
    if (!content || content.length === 0) {
      return [];
    }

    const chunks: Array<{
      content: string;
      metadata: any;
      chunkIndex: number;
      totalChunks: number;
    }> = [];

    // Check if content is JSON (common for large data files)
    const isJson = this.isJsonContent(content);

    if (isJson) {
      return this.splitJsonContent(content, metadata);
    }

    // Split by paragraphs first (preserve semantic units)
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If a single paragraph is too large, split it
      if (paragraph.length > this.MAX_CHUNK_SIZE) {
        // Save current chunk if it exists
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: { ...metadata, chunkIndex },
            chunkIndex,
            totalChunks: 0, // Will be updated later
          });
          chunkIndex++;
          currentChunk = '';
        }

        // Split large paragraph into sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > this.MAX_CHUNK_SIZE) {
            if (currentChunk) {
              chunks.push({
                content: currentChunk.trim(),
                metadata: { ...metadata, chunkIndex },
                chunkIndex,
                totalChunks: 0,
              });
              chunkIndex++;
            }
            currentChunk = sentence;
          } else {
            currentChunk += ' ' + sentence;
          }
        }
      } else if (currentChunk.length + paragraph.length > this.MAX_CHUNK_SIZE) {
        // Save current chunk and start new one
        chunks.push({
          content: currentChunk.trim(),
          metadata: { ...metadata, chunkIndex },
          chunkIndex,
          totalChunks: 0,
        });
        chunkIndex++;
        currentChunk = paragraph;
      } else {
        // Add to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { ...metadata, chunkIndex },
        chunkIndex,
        totalChunks: 0,
      });
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.totalChunks = totalChunks;
    });

    this.logger.log(`Split content into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    // This is a simplification; actual tokenization is more complex
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if content needs chunking
   */
  needsChunking(content: string, maxTokens: number = 1000): boolean {
    return this.estimateTokens(content) > maxTokens;
  }

  /**
   * Check if content is JSON
   */
  private isJsonContent(content: string): boolean {
    const trimmed = content.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }

  /**
   * Split JSON content into smaller chunks
   */
  private splitJsonContent(
    content: string,
    metadata: any = {},
  ): Array<{
    content: string;
    metadata: any;
    chunkIndex: number;
    totalChunks: number;
  }> {
    const chunks: Array<{
      content: string;
      metadata: any;
      chunkIndex: number;
      totalChunks: number;
    }> = [];

    try {
      const parsed = JSON.parse(content);

      // If it's an array, split by elements
      if (Array.isArray(parsed)) {
        const itemsPerChunk = Math.max(
          1,
          Math.floor(
            this.MAX_JSON_CHUNK_SIZE / (content.length / parsed.length),
          ),
        );

        for (let i = 0; i < parsed.length; i += itemsPerChunk) {
          const chunkItems = parsed.slice(i, i + itemsPerChunk);
          chunks.push({
            content: JSON.stringify(chunkItems, null, 2),
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              arrayRange: `[${i}-${Math.min(i + itemsPerChunk - 1, parsed.length - 1)}]`,
            },
            chunkIndex: chunks.length,
            totalChunks: 0,
          });
        }
      }
      // If it's an object, split by keys
      else if (typeof parsed === 'object') {
        const entries = Object.entries(parsed);
        const entriesPerChunk = Math.max(1, Math.floor(50)); // 50 entries per chunk for objects

        for (let i = 0; i < entries.length; i += entriesPerChunk) {
          const chunkEntries = entries.slice(i, i + entriesPerChunk);
          const chunkObj = Object.fromEntries(chunkEntries);
          chunks.push({
            content: JSON.stringify(chunkObj, null, 2),
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              keys: chunkEntries.map(([k]) => k).join(', '),
            },
            chunkIndex: chunks.length,
            totalChunks: 0,
          });
        }
      }
    } catch (error) {
      // If JSON parsing fails, fall back to simple character splitting
      this.logger.warn(
        'Failed to parse JSON, falling back to character splitting',
      );
      const maxChunkSize = this.MAX_JSON_CHUNK_SIZE;

      for (let i = 0; i < content.length; i += maxChunkSize) {
        chunks.push({
          content: content.substring(i, i + maxChunkSize),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            byteRange: `[${i}-${Math.min(i + maxChunkSize - 1, content.length - 1)}]`,
          },
          chunkIndex: chunks.length,
          totalChunks: 0,
        });
      }
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.totalChunks = totalChunks;
    });

    this.logger.log(`Split JSON content into ${chunks.length} chunks`);
    return chunks;
  }
}
