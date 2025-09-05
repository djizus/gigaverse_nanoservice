import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { SupabaseDocumentService } from './services/supabase-document.service';
import { ChromaService } from './services/chroma.service';
import { IndexingService } from './services/indexing.service';
import { ChunkingService } from './services/chunking.service';
import { MarkdownParser } from './parsers/markdown.parser';
import { JsonParser } from './parsers/json.parser';
import { TextParser } from './parsers/text.parser';
@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    SupabaseDocumentService,
    ChromaService,
    IndexingService,
    ChunkingService,
    MarkdownParser,
    JsonParser,
    TextParser,
  ],
  exports: [KnowledgeService, ChromaService],
})
export class KnowledgeModule {}
