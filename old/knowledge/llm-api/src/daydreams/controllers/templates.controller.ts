import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { TemplateService } from '../template.service';
import { DaydreamsService } from '../daydreams.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { ResponseWrapper } from '../utils/response-wrapper';

// DTOs for template operations
export class CreateTemplateDto {
  id?: string;
  name?: string;
  description?: string;
  content?: string;
  contextType?: string;
  defaultArgs?: Record<string, unknown>;

  // Enhanced template fields
  model_type?: string;
  model_id?: string;
  contexts?: string[];
  context_args?: Record<string, any>;
  instructions?: string;
  variables?: Array<{
    name: string;
    description?: string;
    type?: string;
    defaultValue?: any;
    required?: boolean;
    options?: string[];
  }>;
  mcpServers?: string[];
  tags?: string[];
  version?: string;
  example_prompts?: string[];
}

export class UpdateTemplateDto {
  name?: string;
  description?: string;
  content?: string;
  contextType?: string;
  defaultArgs?: Record<string, unknown>;
}

@Controller('templates')
@UseGuards(SupabaseAuthGuard)
export class TemplatesController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly daydreamsService: DaydreamsService,
  ) {}

  /**
   * Get all templates
   */
  @Get()
  async getTemplates(@CurrentUserId() userId: string) {
    return ResponseWrapper.tryExecute(async () => {
      const templates = await this.templateService.getAllTemplates();
      return { templates };
    });
  }

  /**
   * Get a specific template by ID
   */
  @Get(':id')
  async getTemplate(
    @Param('id') templateId: string,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      console.log('[DEBUG] Fetching template by ID:', templateId);

      // Try TemplateService first (new enhanced templates)
      const template = await this.templateService.getTemplateById(templateId);
      if (!template) {
        console.log(
          '[DEBUG] Template not found in TemplateService, trying DaydreamsService',
        );
        // Fallback to old context templates
        const contextTemplate =
          await this.daydreamsService.getContextTemplate(templateId);
        if (!contextTemplate) {
          return {
            success: false,
            error: `Template ${templateId} not found`,
          };
        }
        return {
          success: true,
          template: contextTemplate,
        };
      }

      console.log('[DEBUG] Template retrieved from TemplateService:', {
        id: template.id,
        name: template.name,
        hasInstructions: !!template.instructions,
        contexts: template.contexts,
        model_type: template.model_type,
        model_id: template.model_id,
      });

      return {
        success: true,
        template,
      };
    });
  }

  /**
   * Create a new template
   */
  @Post()
  async createTemplate(
    @Body(new ValidationPipe({ transform: true })) dto: CreateTemplateDto,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      console.log('[DEBUG] Creating template:', {
        id: dto.id,
        name: dto.name,
        hasContent: !!dto.content,
        model_type: dto.model_type,
        contexts: dto.contexts,
      });

      // Validate context type if provided
      if (dto.contextType) {
        const contexts = this.daydreamsService.getAvailableContexts();
        if (!contexts.includes(dto.contextType)) {
          return {
            success: false,
            error: `Context type ${dto.contextType} not found. Available types: ${contexts.join(', ')}`,
          };
        }
      }

      // Create enhanced template object
      const template = {
        id: dto.id,
        name: dto.name,
        description: dto.description,

        // Model configuration
        model_type: dto.model_type,
        model_id: dto.model_id,

        // Agent behavior
        instructions: dto.instructions || dto.content || '',
        contexts: dto.contexts,
        context_args: dto.context_args,

        // Template system
        variables: dto.variables || [],
        example_prompts: dto.example_prompts || [],
        tags: dto.tags || [],
        version: dto.version || '1.0.0',

        // MCP integration
        mcp_servers: dto.mcpServers || [],

        // Metadata
        status: 'active',
        metadata: {},

        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createdId = await this.templateService.createTemplate(
        template as any,
      );
      return {
        success: true,
        templateId: createdId,
        message: `Template ${createdId} created successfully`,
      };
    });
  }

  /**
   * Update a template
   */
  @Put(':id')
  async updateTemplate(
    @Param('id') templateId: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: `Template ${templateId} not found`,
        };
      }

      // Create the updated template with the new values
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

      // If contextType is changed, update the context reference
      if (
        dto.contextType &&
        dto.contextType !== (template.context as any).type
      ) {
        const contexts = this.daydreamsService.getAvailableContexts();
        if (!contexts.includes(dto.contextType)) {
          return {
            success: false,
            error: `Context type ${dto.contextType} not found. Available types: ${contexts.join(', ')}`,
          };
        }
        updatedTemplate.context = { type: dto.contextType } as any;
      }

      const success = await this.daydreamsService.updateContextTemplate(
        templateId,
        updatedTemplate,
      );

      if (success) {
        return {
          success: true,
          message: `Template ${templateId} updated successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to update template ${templateId}`,
        };
      }
    });
  }

  /**
   * Delete a template
   */
  @Delete(':id')
  async deleteTemplate(
    @Param('id') templateId: string,
    @CurrentUserId() userId: string,
  ) {
    return ResponseWrapper.tryExecute(async () => {
      const template =
        await this.daydreamsService.getContextTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: `Template ${templateId} not found`,
        };
      }

      const success =
        await this.daydreamsService.deleteContextTemplate(templateId);

      if (success) {
        return {
          success: true,
          message: `Template ${templateId} deleted successfully`,
        };
      } else {
        return {
          success: false,
          error: `Failed to delete template ${templateId}`,
        };
      }
    });
  }
}
