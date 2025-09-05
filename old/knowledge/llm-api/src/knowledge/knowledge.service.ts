import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateDocumentDto, UpdateDocumentDto, SearchQueryDto } from './dto';
import { Document, DocumentChunk } from './entities/document.entity';
import { SupabaseDocumentService } from './services/supabase-document.service';
import { ChromaService } from './services/chroma.service';
import { IndexingService } from './services/indexing.service';
import { MarkdownParser } from './parsers/markdown.parser';
import { JsonParser } from './parsers/json.parser';
import { TextParser } from './parsers/text.parser';
import { DocumentParser } from './parsers/parser.interface';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly parsers: Map<string, DocumentParser> = new Map();
  private readonly documents: Map<string, Document> = new Map();

  constructor(
    private readonly storageService: SupabaseDocumentService,
    private readonly chromaService: ChromaService,
    private readonly indexingService: IndexingService,
    markdownParser: MarkdownParser,
    jsonParser: JsonParser,
    textParser: TextParser,
  ) {
    // Register parsers
    this.registerParser(markdownParser);
    this.registerParser(jsonParser);
    this.registerParser(textParser);
  }

  private registerParser(parser: DocumentParser) {
    parser.getSupportedTypes().forEach(type => {
      this.parsers.set(type, parser);
    });
  }

  async createDocument(
    dto: CreateDocumentDto & { agentId: string },
  ): Promise<Document> {
    const id = randomUUID();
    const type = dto.type || this.detectFileType(dto.path);
    const parser = this.parsers.get(type);

    if (!parser) {
      throw new Error(`No parser available for type: ${type}`);
    }

    // Parse document
    const parseResult = await parser.parse(dto.content, id);

    // Create document entity
    const document: Document = {
      id,
      agentId: dto.agentId,
      path: dto.path,
      content: parseResult.content,
      type,
      metadata: {
        ...parseResult.metadata,
        ...dto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      chunks: parseResult.chunks,
      indexed: false,
      size: Buffer.byteLength(dto.content, 'utf8'),
      hash: this.storageService.calculateHash(dto.content),
    };

    // Store document
    await this.storageService.saveDocument(document);
    this.documents.set(id, document);

    // Index if requested
    if (dto.index !== false) {
      await this.indexingService.indexDocument(document);
      document.indexed = true;
      document.indexedAt = new Date();
    }

    this.logger.log(`Document created: ${id} (${type}) at ${dto.path}`);
    return document;
  }

  async getDocument(agentId: string, id: string): Promise<Document | null> {
    let document = this.documents.get(id);
    if (!document) {
      document = await this.storageService.loadDocument(id);
      if (document) {
        this.documents.set(id, document);
      }
    }
    // Verify the document belongs to the agent
    if (document && document.agentId !== agentId) {
      return null;
    }
    return document || null;
  }

  async getDocumentByPath(
    agentId: string,
    path: string,
  ): Promise<Document | null> {
    // First check in memory
    for (const doc of this.documents.values()) {
      if (doc.path === path && doc.agentId === agentId) {
        return doc;
      }
    }
    // Then check storage
    return await this.storageService.loadDocumentByPath(agentId, path);
  }

  async updateDocument(
    agentId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null> {
    const document = await this.getDocument(agentId, id);
    if (!document) {
      return null;
    }

    // Update content if provided
    if (dto.content !== undefined) {
      const type = dto.type || document.type;
      const parser = this.parsers.get(type);

      if (parser) {
        const parseResult = await parser.parse(dto.content, id);
        document.content = parseResult.content;
        document.chunks = parseResult.chunks;
        document.metadata = {
          ...document.metadata,
          ...parseResult.metadata,
          ...dto.metadata,
        };
      } else {
        document.content = dto.content;
      }

      document.size = Buffer.byteLength(dto.content, 'utf8');
      document.hash = this.storageService.calculateHash(dto.content);
    }

    // Update metadata
    if (dto.metadata) {
      document.metadata = {
        ...document.metadata,
        ...dto.metadata,
      };
    }

    document.metadata.updatedAt = new Date();
    document.metadata.version = (document.metadata.version || 1) + 1;

    // Save changes
    await this.storageService.saveDocument(document);

    // Re-index if requested
    if (dto.reindex !== false && dto.content !== undefined) {
      // Use reindexDocument instead of indexDocument to properly update ChromaDB
      // This will delete old chunks before adding new ones
      await this.indexingService.reindexDocument(document);
      document.indexed = true;
      document.indexedAt = new Date();
    }

    this.logger.log(`Document updated: ${id}`);
    return document;
  }

  async updateDocumentByPath(
    agentId: string,
    path: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null> {
    const document = await this.getDocumentByPath(agentId, path);
    if (!document) {
      return null;
    }
    return await this.updateDocument(agentId, document.id, dto);
  }

  async deleteDocument(agentId: string, id: string): Promise<boolean> {
    const document = await this.getDocument(agentId, id);
    if (!document) {
      return false;
    }

    // Remove from index
    if (document.indexed) {
      await this.chromaService.deleteDocument(agentId, id);
    }

    // Remove from storage
    await this.storageService.deleteDocument(id);
    this.documents.delete(id);

    this.logger.log(`Document deleted: ${id}`);
    return true;
  }

  async listDocuments(filters?: {
    agentId?: string;
    collection?: string;
    type?: string;
  }): Promise<Document[]> {
    const allDocs = await this.storageService.listDocuments();

    if (!filters) {
      return allDocs;
    }

    return allDocs.filter(doc => {
      if (filters.agentId && doc.agentId !== filters.agentId) {
        return false;
      }
      if (
        filters.collection &&
        doc.metadata.collection !== filters.collection
      ) {
        return false;
      }
      if (filters.type && doc.type !== filters.type) {
        return false;
      }
      return true;
    });
  }

  async getCollections(agentId: string): Promise<string[]> {
    const documents = await this.listDocuments({ agentId });
    const collections = new Set<string>();

    documents.forEach(doc => {
      if (doc.metadata.collection) {
        collections.add(doc.metadata.collection);
      }
    });

    return Array.from(collections).sort();
  }

  async search(agentId: string, dto: SearchQueryDto): Promise<any[]> {
    const { query, limit, mode, ...filters } = dto;

    let results: any[] = [];

    if (mode === 'semantic' || mode === 'hybrid') {
      // Semantic search using ChromaDB
      const chromaResults = await this.chromaService.query(
        agentId,
        query,
        limit || 10,
        filters,
      );
      results = chromaResults;
    }

    if (mode === 'keyword' || mode === 'hybrid') {
      // Keyword search
      const keywordResults = await this.searchByKeyword(
        agentId,
        query,
        filters,
      );

      if (mode === 'hybrid') {
        // Merge results, prioritizing semantic matches
        const resultIds = new Set(results.map(r => r.id));
        keywordResults.forEach(result => {
          if (!resultIds.has(result.id)) {
            results.push(result);
          }
        });
      } else {
        results = keywordResults;
      }
    }

    // Limit results
    return results.slice(0, limit || 10);
  }

  private async searchByKeyword(
    agentId: string,
    query: string,
    filters: any,
  ): Promise<any[]> {
    const documents = await this.listDocuments({ ...filters, agentId });
    const queryLower = query.toLowerCase();

    const results = documents
      .filter(doc => {
        const contentMatch = doc.content.toLowerCase().includes(queryLower);
        const titleMatch = doc.metadata.title
          ?.toLowerCase()
          .includes(queryLower);
        const tagMatch = doc.metadata.tags?.some(tag =>
          tag.toLowerCase().includes(queryLower),
        );

        return contentMatch || titleMatch || tagMatch;
      })
      .map(doc => ({
        id: doc.id,
        text: this.extractSnippet(doc.content, queryLower),
        metadata: {
          source: doc.path,
          ...doc.metadata,
        },
        score: this.calculateKeywordScore(doc, queryLower),
      }))
      .sort((a, b) => b.score - a.score);

    return results;
  }

  private extractSnippet(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query);
    if (index === -1) return content.substring(0, 200) + '...';

    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + query.length + 100);

    return (
      (start > 0 ? '...' : '') +
      content.substring(start, end) +
      (end < content.length ? '...' : '')
    );
  }

  private calculateKeywordScore(doc: Document, query: string): number {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Count occurrences in content
    let index = -1;
    while ((index = contentLower.indexOf(queryLower, index + 1)) !== -1) {
      score += 1;
    }

    // Bonus for title match
    if (doc.metadata.title?.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Bonus for tag match
    if (
      doc.metadata.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    ) {
      score += 3;
    }

    return score;
  }

  async indexDocument(agentId: string, id: string): Promise<boolean> {
    const document = await this.getDocument(agentId, id);
    if (!document) {
      return false;
    }

    await this.indexingService.indexDocument(document);
    document.indexed = true;
    document.indexedAt = new Date();

    await this.storageService.saveDocument(document);

    this.logger.log(`Document indexed: ${id}`);
    return true;
  }

  detectFileType(path: string): 'markdown' | 'json' | 'text' | 'yaml' {
    const ext = path.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'json':
        return 'json';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'txt':
      case 'text':
      default:
        return 'text';
    }
  }
}
