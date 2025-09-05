import {
  Document,
  DocumentChunk,
  DocumentMetadata,
} from '../entities/document.entity';

export interface ParseResult {
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
}

export interface DocumentParser {
  /**
   * Parse a document and extract content, metadata, and chunks
   */
  parse(content: string, documentId: string): Promise<ParseResult>;

  /**
   * Check if this parser can handle the given file type
   */
  canParse(fileType: string): boolean;

  /**
   * Get the file types this parser supports
   */
  getSupportedTypes(): string[];
}
