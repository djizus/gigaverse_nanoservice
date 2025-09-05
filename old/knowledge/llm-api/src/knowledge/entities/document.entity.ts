export interface DocumentMetadata {
  title?: string;
  tags?: string[];
  source?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  collection?: string;
  language?: string;
  [key: string]: any; // Allow custom metadata
}

export interface Document {
  id: string;
  agentId: string; // Agent that owns this document
  path: string;
  content: string;
  type: 'markdown' | 'json' | 'text' | 'yaml';
  metadata: DocumentMetadata;
  chunks?: DocumentChunk[];
  indexed?: boolean;
  indexedAt?: Date;
  size?: number;
  hash?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    section?: string;
    paragraph?: number;
    startLine?: number;
    endLine?: number;
    [key: string]: any;
  };
  embedding?: number[];
}
