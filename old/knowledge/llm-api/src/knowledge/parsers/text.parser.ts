import { Injectable } from '@nestjs/common';
import { DocumentParser, ParseResult } from './parser.interface';
import { DocumentChunk, DocumentMetadata } from '../entities/document.entity';

@Injectable()
export class TextParser implements DocumentParser {
  async parse(content: string, documentId: string): Promise<ParseResult> {
    const metadata: DocumentMetadata = {};
    const chunks: DocumentChunk[] = [];

    // Try to extract title from first line
    const lines = content.split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      const firstLine = lines[0].trim();
      // If first line is short and doesn't end with punctuation, treat as title
      if (firstLine.length < 100 && !firstLine.match(/[.!?]$/)) {
        metadata.title = firstLine;
      }
    }

    // Split into paragraphs
    const paragraphs = content
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean);

    // If no paragraphs found, split by sentences
    if (paragraphs.length <= 1) {
      const sentences = this.splitIntoSentences(content);
      const chunkedSentences = this.chunkSentences(sentences, 500); // ~500 chars per chunk

      chunkedSentences.forEach((chunk, index) => {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          documentId,
          content: chunk,
          metadata: {
            paragraph: index,
            type: 'sentence-group',
          },
        });
      });
    } else {
      // Create chunks from paragraphs
      paragraphs.forEach((paragraph, index) => {
        // If paragraph is too long, split it further
        if (paragraph.length > 1000) {
          const sentences = this.splitIntoSentences(paragraph);
          const subChunks = this.chunkSentences(sentences, 500);

          subChunks.forEach((subChunk, subIndex) => {
            chunks.push({
              id: `${documentId}-chunk-${chunks.length}`,
              documentId,
              content: subChunk,
              metadata: {
                paragraph: index,
                subParagraph: subIndex,
                type: 'paragraph-part',
              },
            });
          });
        } else {
          chunks.push({
            id: `${documentId}-chunk-${chunks.length}`,
            documentId,
            content: paragraph,
            metadata: {
              paragraph: index,
              type: 'paragraph',
            },
          });
        }
      });
    }

    // Extract potential metadata from content patterns
    this.extractMetadataFromPatterns(content, metadata);

    return {
      content,
      metadata,
      chunks,
    };
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (could be improved with NLP)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(Boolean);
  }

  private chunkSentences(sentences: string[], targetSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > targetSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private extractMetadataFromPatterns(
    content: string,
    metadata: DocumentMetadata,
  ): void {
    // Extract date patterns
    const dateMatch = content.match(
      /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/,
    );
    if (dateMatch && !metadata.date) {
      metadata.date = dateMatch[1];
    }

    // Extract email patterns (potential author)
    const emailMatch = content.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    );
    if (emailMatch && !metadata.author) {
      metadata.authorEmail = emailMatch[0];
    }

    // Extract URLs
    const urlMatches = content.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 0) {
      metadata.urls = urlMatches;
    }

    // Detect language (simple heuristic)
    if (!metadata.language) {
      metadata.language = this.detectLanguage(content);
    }
  }

  private detectLanguage(content: string): string {
    // Very simple language detection based on common words
    const frenchWords =
      /\b(le|la|les|de|du|des|et|ou|dans|sur|avec|pour|par|sans)\b/gi;
    const frenchMatches = content.match(frenchWords);

    if (
      frenchMatches &&
      frenchMatches.length > content.split(/\s+/).length * 0.1
    ) {
      return 'fr';
    }

    return 'en';
  }

  canParse(fileType: string): boolean {
    return ['text', 'txt'].includes(fileType.toLowerCase());
  }

  getSupportedTypes(): string[] {
    return ['text', 'txt'];
  }
}
