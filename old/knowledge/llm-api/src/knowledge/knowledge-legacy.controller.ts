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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { CreateDocumentDto, UpdateDocumentDto, SearchQueryDto } from './dto';

@ApiTags('knowledge-legacy')
@Controller('knowledge')
// @UseGuards(JwtAuthGuard)
export class KnowledgeLegacyController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  private getDefaultAgentId(userId: string): string {
    // Use a default agent ID for the user
    return `default-agent-${userId}`;
  }

  @Get('files')
  @ApiOperation({ summary: 'List all documents (legacy)' })
  async listFiles(@Request() req) {
    const agentId = this.getDefaultAgentId(req.user.id);
    const files = await this.knowledgeService.listDocuments({ agentId });
    return {
      success: true,
      files,
    };
  }

  @Get('files/:path(*)')
  @ApiOperation({ summary: 'Get file by path (legacy)' })
  async getFile(@Param('path') path: string, @Request() req) {
    const agentId = this.getDefaultAgentId(req.user.id);
    const document = await this.knowledgeService.getDocumentByPath(
      agentId,
      path,
    );
    if (!document) {
      return {
        success: false,
        error: 'File not found',
      };
    }
    return {
      success: true,
      file: document,
    };
  }

  @Post('files/:path(*)')
  @ApiOperation({ summary: 'Create file (legacy)' })
  async createFile(
    @Param('path') path: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    const agentId = this.getDefaultAgentId(req.user.id);
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
      file: document,
    };
  }

  @Put('files/:path(*)')
  @ApiOperation({ summary: 'Update file (legacy)' })
  async updateFile(
    @Param('path') path: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    const agentId = this.getDefaultAgentId(req.user.id);
    const document = await this.knowledgeService.updateDocumentByPath(
      agentId,
      path,
      {
        content: body.content,
      },
    );
    if (!document) {
      return {
        success: false,
        error: 'File not found',
      };
    }
    return {
      success: true,
      file: document,
    };
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search documents (legacy)' })
  async search(@Body() body: { term: string }, @Request() req) {
    const agentId = this.getDefaultAgentId(req.user.id);
    const results = await this.knowledgeService.search(agentId, {
      query: body.term,
    });
    return {
      success: true,
      results,
    };
  }
}
