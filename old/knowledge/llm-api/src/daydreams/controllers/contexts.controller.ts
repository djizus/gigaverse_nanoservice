import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { DaydreamsService } from '../daydreams.service';
import { CreateContextDto, UpdateContextDto } from '../dto/context.dto';
import {
  CreateContextTemplateDto,
  UpdateContextTemplateDto,
} from '../dto/template.dto';
import { ResponseWrapper } from '../utils/response-wrapper';

@Controller('daydreams/contexts')
export class ContextsController {
  constructor(private readonly daydreamsService: DaydreamsService) {}

  @Get()
  getAvailableContexts() {
    const contexts = this.daydreamsService.getAvailableContexts();
    return {
      success: true,
      contexts: contexts || [],
      count: contexts?.length || 0,
    };
  }

  @Get('templates')
  async getContextTemplates() {
    const templates = await this.daydreamsService.getContextTemplates();
    return {
      success: true,
      templates: templates || [],
      count: templates?.length || 0,
    };
  }

  @Get(':id')
  getContext(@Param('id') contextId: string) {
    return ResponseWrapper.tryExecute(async () => {
      const contextExists = this.daydreamsService
        .getAvailableContexts()
        .includes(contextId);

      if (!contextExists) {
        throw new Error(`Context ${contextId} not found`);
      }

      const contextDetails = this.daydreamsService.getContextDetails(contextId);
      return {
        id: contextId,
        ...contextDetails,
      };
    });
  }

  @Post()
  async createContext(@Body() dto: CreateContextDto) {
    return ResponseWrapper.tryExecute(async () => {
      const success = await this.daydreamsService.createContext(
        dto.id,
        dto.name,
        dto.description,
        dto.defaultArgs || {},
      );

      if (!success) {
        throw new Error(`Failed to create context ${dto.id}`);
      }

      return {
        message: `Context ${dto.id} created successfully`,
      };
    });
  }

  @Put(':id')
  async updateContext(
    @Param('id') contextId: string,
    @Body() dto: UpdateContextDto,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      const success = await this.daydreamsService.updateContext(
        contextId,
        dto.name,
        dto.description,
        dto.defaultArgs,
      );

      if (!success) {
        throw new Error(`Failed to update context ${contextId}`);
      }

      return {
        message: `Context ${contextId} updated successfully`,
      };
    });
  }

  @Delete(':id')
  async deleteContext(@Param('id') contextId: string) {
    return ResponseWrapper.tryExecute(async () => {
      const success = await this.daydreamsService.deleteContext(contextId);

      if (!success) {
        throw new Error(`Failed to delete context ${contextId}`);
      }

      return {
        message: `Context ${contextId} deleted successfully`,
      };
    });
  }

  @Get(':contextId/templates/:templateId')
  async getContextTemplate(
    @Param('contextId') contextId: string,
    @Param('templateId') templateId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      if (!this.daydreamsService.getAvailableContexts().includes(contextId)) {
        throw new Error(`Context ${contextId} not found`);
      }

      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.context.type !== contextId) {
        throw new Error(
          `Template ${templateId} does not belong to context ${contextId}`,
        );
      }

      return { template };
    });
  }

  @Post(':contextId/templates')
  async createContextTemplate(
    @Param('contextId') contextId: string,
    @Body() dto: CreateContextTemplateDto,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      if (!this.daydreamsService.getAvailableContexts().includes(contextId)) {
        throw new Error(`Context ${contextId} not found`);
      }

      if (dto.contextType !== contextId) {
        throw new Error(
          `Template context type must match the context ID: ${contextId}`,
        );
      }

      const template = {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        content: dto.content,
        context: { type: contextId } as any,
        defaultArgs: dto.defaultArgs || {},
      };

      const createdId = this.daydreamsService.createContextTemplate(template);
      return {
        templateId: createdId,
        message: `Template ${createdId} created successfully for context ${contextId}`,
      };
    });
  }

  @Put(':contextId/templates/:templateId')
  async updateContextTemplate(
    @Param('contextId') contextId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateContextTemplateDto,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      if (!this.daydreamsService.getAvailableContexts().includes(contextId)) {
        throw new Error(`Context ${contextId} not found`);
      }

      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.context.type !== contextId) {
        throw new Error(
          `Template ${templateId} does not belong to context ${contextId}`,
        );
      }

      if (dto.contextType && dto.contextType !== contextId) {
        throw new Error(
          `Template context type must match the context ID: ${contextId}`,
        );
      }

      const updatedTemplate = {
        ...template,
        name: dto.name !== undefined ? dto.name : template.name,
        description:
          dto.description !== undefined
            ? dto.description
            : template.description,
        content: dto.content !== undefined ? dto.content : template.content,
        defaultArgs:
          dto.defaultArgs !== undefined
            ? dto.defaultArgs
            : template.defaultArgs,
      };

      const success = this.daydreamsService.updateContextTemplate(
        templateId,
        updatedTemplate,
      );

      if (!success) {
        throw new Error(`Failed to update template ${templateId}`);
      }

      return {
        message: `Template ${templateId} updated successfully`,
      };
    });
  }

  @Delete(':contextId/templates/:templateId')
  async deleteContextTemplate(
    @Param('contextId') contextId: string,
    @Param('templateId') templateId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      if (!this.daydreamsService.getAvailableContexts().includes(contextId)) {
        throw new Error(`Context ${contextId} not found`);
      }

      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.context.type !== contextId) {
        throw new Error(
          `Template ${templateId} does not belong to context ${contextId}`,
        );
      }

      const success =
        await this.daydreamsService.deleteContextTemplate(templateId);
      if (!success) {
        throw new Error(`Failed to delete template ${templateId}`);
      }

      return {
        message: `Template ${templateId} deleted successfully`,
      };
    });
  }

  // New Factory System Endpoints

  @Get(':contextId/capabilities')
  getContextCapabilities(@Param('contextId') contextId: string) {
    return ResponseWrapper.tryExecute(async () => {
      if (!this.daydreamsService.getAvailableContexts().includes(contextId)) {
        throw new Error(`Context ${contextId} not found`);
      }

      // const capabilities = this.daydreamsService.getAvailableCapabilities([contextId]); // TODO: Reimplément
      const capabilities: string[] = [];

      return {
        contextId,
        capabilities,
        count: capabilities.length,
      };
    });
  }

  @Get(':contextId/validate')
  validateContext(@Param('contextId') contextId: string) {
    return ResponseWrapper.tryExecute(async () => {
      // const supportedTypes = this.daydreamsService.getSupportedContextTypes(); // TODO: Reimplément
      const supportedTypes: string[] = [];
      const contextInfo = {
        type: contextId,
        isAvailable: true,
        capabilities: [],
      }; // TODO: Reimplément properly

      if (!contextInfo) {
        return {
          contextId,
          isSupported: false,
          error: `Context type '${contextId}' is not supported`,
          availableContexts: supportedTypes,
        };
      }

      return {
        contextId,
        isSupported: contextInfo.isAvailable,
        capabilities: contextInfo.capabilities,
        missingServices: contextInfo.isAvailable
          ? []
          : ['Check server logs for details'],
      };
    });
  }

  @Post('suggest')
  suggestContextsForCapabilities(
    @Body() body: { requestedCapabilities: string[] },
  ) {
    return ResponseWrapper.tryExecute(async () => {
      const { requestedCapabilities } = body;

      if (!Array.isArray(requestedCapabilities)) {
        throw new Error('requestedCapabilities must be an array');
      }

      // const suggestions = this.daydreamsService.suggestContextsForCapabilities(requestedCapabilities); // TODO: Reimplément
      const suggestions: any[] = [];

      return {
        requestedCapabilities,
        suggestions,
        count: suggestions.length,
      };
    });
  }

  @Get('types')
  getSupportedContextTypes() {
    return ResponseWrapper.tryExecute(async () => {
      // const supportedTypes = this.daydreamsService.getSupportedContextTypes(); // TODO: Reimplément
      const supportedTypes: string[] = [];

      return {
        success: true,
        contextTypes: supportedTypes,
        count: supportedTypes.length,
      };
    });
  }

  @Get('capabilities/all')
  getAllCapabilities() {
    return ResponseWrapper.tryExecute(async () => {
      // const capabilities = this.daydreamsService.getAllAvailableCapabilities(); // TODO: Reimplément
      const capabilities: string[] = [];

      return {
        success: true,
        capabilities,
        count: capabilities.length,
      };
    });
  }
}
