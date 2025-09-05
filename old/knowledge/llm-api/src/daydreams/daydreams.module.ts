import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DaydreamsService } from './daydreams.service';
import { TemplateService } from './template.service';
import { AgentsController } from './controllers/agents.controller';
import { ContextsController } from './controllers/contexts.controller';
import { DaydreamsController } from './daydreams.controller';
import { TemplateController } from './template.controller';
import { ModelService } from './services/model.service';
import { MemoryService } from './services/memory.service';
import { ContextService } from './services/context.service';
import { CommunicationService } from './services/communication.service';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { McpService } from './services/mcp.service';
import { McpController } from './controllers/mcp.controller';
import { SessionsService } from './services/sessions.service';
import { SessionsController } from './controllers/sessions.controller';
import { AgentFactoryService } from './services/agent-factory.service';
import { ContextFactoryService } from './services/context-factory.service';
import { MessageService } from './services/message.service';
import { StreamingService } from './services/streaming.service';
import { TemplatesController } from './controllers/templates.controller';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [ConfigModule, KnowledgeModule],
  providers: [
    DaydreamsService,
    TemplateService,
    ModelService,
    MemoryService,
    ContextService,
    CommunicationService,
    SupabaseStorageService,
    McpService,
    SessionsService,
    ContextFactoryService,
    AgentFactoryService,
    MessageService,
    StreamingService,
  ],
  exports: [
    DaydreamsService,
    TemplateService,
    ModelService,
    MemoryService,
    ContextService,
    CommunicationService,
    McpService,
    SessionsService,
    ContextFactoryService,
    AgentFactoryService,
    MessageService,
    StreamingService,
  ],
  controllers: [
    AgentsController,
    ContextsController,
    DaydreamsController,
    TemplateController,
    TemplatesController,
    McpController,
    SessionsController,
  ],
})
export class DaydreamsModule {}
