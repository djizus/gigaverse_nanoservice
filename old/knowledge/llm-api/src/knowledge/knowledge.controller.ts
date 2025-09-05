import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  // UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { KnowledgeService } from './knowledge.service';
import { CreateDocumentDto, UpdateDocumentDto, SearchQueryDto } from './dto';
import { Document } from './entities/document.entity';

@ApiTags('knowledge')
@Controller('knowledge/agents/:agentId')
// @UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('collections')
  @ApiOperation({ summary: 'List all document collections for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({ status: 200, description: 'Returns list of collections' })
  async getCollections(@Param('agentId') agentId: string) {
    const collections = await this.knowledgeService.getCollections(agentId);
    return {
      success: true,
      collections,
      count: collections.length,
    };
  }

  @Get('files')
  @ApiOperation({ summary: 'List all documents for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiQuery({ name: 'collection', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Returns list of documents' })
  async listDocuments(
    @Param('agentId') agentId: string,
    @Query('collection') collection?: string,
    @Query('type') type?: string,
  ) {
    const files = await this.knowledgeService.listDocuments({
      agentId,
      collection,
      type,
    });
    return {
      success: true,
      files,
      count: files.length,
    };
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create a new document for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createDocument(
    @Param('agentId') agentId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    console.log('Create document called with:', { agentId, dto });
    const document = await this.knowledgeService.createDocument({
      ...dto,
      agentId,
    });
    return {
      success: true,
      document,
      message: 'Document created successfully',
    };
  }

  @Get('files/:path')
  @ApiOperation({ summary: 'Get document by path for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'path', description: 'Document path' })
  @ApiResponse({ status: 200, description: 'Returns document content' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentByPath(
    @Param('agentId') agentId: string,
    @Param('path') path: string,
  ) {
    const document = await this.knowledgeService.getDocumentByPath(
      agentId,
      path,
    );
    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      file: document,
    };
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Returns document' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
  ) {
    const document = await this.knowledgeService.getDocument(agentId, id);
    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      document,
    };
  }

  @Put('files/:path')
  @ApiOperation({ summary: 'Update document by path for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'path', description: 'Document path' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocumentByPath(
    @Param('agentId') agentId: string,
    @Param('path') path: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const document = await this.knowledgeService.updateDocumentByPath(
      agentId,
      path,
      dto,
    );
    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      document,
      message: 'Document updated successfully',
    };
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocument(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const document = await this.knowledgeService.updateDocument(
      agentId,
      id,
      dto,
    );
    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      document,
      message: 'Document updated successfully',
    };
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
  ) {
    const result = await this.knowledgeService.deleteDocument(agentId, id);
    if (!result) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search documents for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  async searchDocuments(
    @Param('agentId') agentId: string,
    @Body() dto: SearchQueryDto,
  ) {
    const results = await this.knowledgeService.search(agentId, dto);
    return {
      success: true,
      results,
      count: results.length,
      query: dto.query,
    };
  }

  @Post('index/:id')
  @ApiOperation({ summary: 'Force re-index a document for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document indexed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async indexDocument(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
  ) {
    const result = await this.knowledgeService.indexDocument(agentId, id);
    if (!result) {
      return {
        success: false,
        error: 'Document not found',
      };
    }
    return {
      success: true,
      message: 'Document indexed successfully',
    };
  }

  @Post('files/:path')
  @ApiOperation({
    summary:
      'Create document by path for an agent (for frontend compatibility)',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'path', description: 'Document path' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  async createDocumentByPath(
    @Param('agentId') agentId: string,
    @Param('path') path: string,
    @Body() body: { content: string },
  ) {
    const dto: CreateDocumentDto = {
      path,
      content: body.content,
      type: this.knowledgeService.detectFileType(path),
    };
    const document = await this.knowledgeService.createDocument({
      ...dto,
      agentId,
    });
    return {
      success: true,
      document,
      message: 'Document created successfully',
    };
  }
}
