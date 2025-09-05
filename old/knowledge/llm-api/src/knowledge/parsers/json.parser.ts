import { Injectable } from '@nestjs/common';
import { DocumentParser, ParseResult } from './parser.interface';
import { DocumentChunk, DocumentMetadata } from '../entities/document.entity';

@Injectable()
export class JsonParser implements DocumentParser {
  async parse(content: string, documentId: string): Promise<ParseResult> {
    const metadata: DocumentMetadata = {};
    const chunks: DocumentChunk[] = [];

    try {
      const data = JSON.parse(content);

      // Extract metadata from common fields
      if (data.title) metadata.title = data.title;
      if (data.description) metadata.description = data.description;
      if (data.tags)
        metadata.tags = Array.isArray(data.tags) ? data.tags : [data.tags];
      if (data.author) metadata.author = data.author;
      if (data.version) metadata.version = data.version;
      if (data.metadata) {
        Object.assign(metadata, data.metadata);
      }

      // Create chunks from JSON structure
      this.extractChunks(data, documentId, chunks);

      // Create human-readable content
      const readableContent = this.jsonToReadable(data);

      return {
        content: readableContent,
        metadata,
        chunks,
      };
    } catch (error) {
      // If JSON parsing fails, treat as plain text
      return {
        content,
        metadata: { parseError: error.message },
        chunks: [
          {
            id: `${documentId}-chunk-0`,
            documentId,
            content,
            metadata: { error: 'Failed to parse JSON' },
          },
        ],
      };
    }
  }

  private extractChunks(
    obj: any,
    documentId: string,
    chunks: DocumentChunk[],
    path: string[] = [],
  ): void {
    if (typeof obj === 'string' && obj.length > 50) {
      // Create chunk for long strings
      chunks.push({
        id: `${documentId}-chunk-${chunks.length}`,
        documentId,
        content: obj,
        metadata: {
          path: path.join('.'),
          type: 'string',
        },
      });
    } else if (Array.isArray(obj)) {
      // Process arrays
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          this.extractChunks(item, documentId, chunks, [...path, `[${index}]`]);
        } else if (typeof item === 'string' && item.length > 50) {
          chunks.push({
            id: `${documentId}-chunk-${chunks.length}`,
            documentId,
            content: item,
            metadata: {
              path: [...path, `[${index}]`].join('.'),
              type: 'array-item',
            },
          });
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      // Process objects
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 50) {
          chunks.push({
            id: `${documentId}-chunk-${chunks.length}`,
            documentId,
            content: value,
            metadata: {
              path: [...path, key].join('.'),
              key,
              type: 'object-value',
            },
          });
        } else if (typeof value === 'object' && value !== null) {
          this.extractChunks(value, documentId, chunks, [...path, key]);
        }
      });
    }

    // If no chunks were created, create one with the entire structure
    if (chunks.length === 0 && path.length === 0) {
      chunks.push({
        id: `${documentId}-chunk-0`,
        documentId,
        content: JSON.stringify(obj, null, 2),
        metadata: {
          type: 'full-document',
        },
      });
    }
  }

  private jsonToReadable(obj: any, indent: number = 0): string {
    const spaces = ' '.repeat(indent);

    if (obj === null) return 'null';
    if (typeof obj !== 'object') return String(obj);

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.map(
        item => `${spaces}- ${this.jsonToReadable(item, indent + 2)}`,
      );
      return items.join('\n');
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    const lines = entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${this.jsonToReadable(value, indent + 2)}`;
      }
      return `${spaces}${key}: ${this.jsonToReadable(value, indent + 2)}`;
    });

    return lines.join('\n');
  }

  canParse(fileType: string): boolean {
    return fileType.toLowerCase() === 'json';
  }

  getSupportedTypes(): string[] {
    return ['json'];
  }
}
