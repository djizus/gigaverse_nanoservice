import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TemplateService, Template } from './template.service';
import { DaydreamsService } from './daydreams.service';
import { AgentFactoryService } from './services/agent-factory.service';

// DTO pour la création et la mise à jour de templates
export class TemplateDto {
  id?: string;
  name: string;
  description?: string;
  model_type?: string;
  model_id?: string;
  instructions?: string;
  contexts?: string[];
  context_args?: Record<string, any>;
  // capabilities?: string[];
  variables?: Array<{
    name: string;
    description: string;
    type?: string;
    defaultValue?: string;
    required?: boolean;
  }>;
  example_prompts?: string[];
  tags?: string[];
  version?: string;
}

// DTO pour le rendu d'un template
export class RenderTemplateDto {
  variables: Record<string, string>;
}

@Controller('daydreams/templates')
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly daydreamsService: DaydreamsService,
    private readonly agentFactoryService: AgentFactoryService,
  ) {}

  @Get()
  async getAllTemplates() {
    try {
      const templates = await this.templateService.getAllTemplates();
      return {
        success: true,
        templates,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch templates',
      };
    }
  }

  @Get(':id')
  async getTemplateById(@Param('id') id: string) {
    try {
      const template = await this.templateService.getTemplateById(id);
      if (!template) {
        return {
          success: false,
          error: `Template ${id} not found`,
        };
      }
      return {
        success: true,
        template,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch template',
      };
    }
  }

  @Post()
  async createTemplate(@Body() templateDto: Partial<TemplateDto>) {
    try {
      // Generate ID if not provided and ensure required fields
      const templateWithId = {
        ...templateDto,
        id:
          templateDto.id ||
          `template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        instructions: templateDto.instructions || '',
        variables: templateDto.variables || [],
      };
      const templateId = await this.templateService.createTemplate(
        templateWithId as Template,
      );
      return {
        success: true,
        templateId,
        message: `Template ${templateId} created successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to create template',
      };
    }
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() templateDto: Partial<TemplateDto>,
  ) {
    try {
      const success = await this.templateService.updateTemplate(
        id,
        templateDto,
      );
      if (success) {
        return {
          success: true,
          message: `Template ${id} updated successfully`,
        };
      }
      return {
        success: false,
        error: `Template ${id} not found`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update template',
      };
    }
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    try {
      const success = await this.templateService.deleteTemplate(id);
      if (success) {
        return {
          success: true,
          message: `Template ${id} deleted successfully`,
        };
      }
      return {
        success: false,
        error: `Template ${id} not found`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete template',
      };
    }
  }

  @Post(':id/duplicate')
  async duplicateTemplate(
    @Param('id') id: string,
    @Body() dto: { name?: string; newId?: string },
  ) {
    try {
      const originalTemplate = await this.templateService.getTemplateById(id);
      if (!originalTemplate) {
        return {
          success: false,
          error: `Template ${id} not found`,
        };
      }

      // Create a new template with a copy of the original
      const newTemplateId = dto.newId || `${id}-copy-${Date.now()}`;
      const newTemplateName = dto.name || `${originalTemplate.name} (Copy)`;

      const duplicatedTemplate = {
        ...originalTemplate,
        id: newTemplateId,
        name: newTemplateName,
        description: `Copy of: ${originalTemplate.description}`,
        created_at: undefined,
        updated_at: undefined,
      };

      const createdId =
        await this.templateService.createTemplate(duplicatedTemplate);
      return {
        success: true,
        templateId: createdId,
        message: `Template duplicated successfully as ${newTemplateName}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to duplicate template',
      };
    }
  }

  @Post(':id/render')
  async renderTemplate(
    @Param('id') id: string,
    @Body() renderDto: RenderTemplateDto,
  ) {
    try {
      const rendered = await this.templateService.renderTemplate(
        id,
        renderDto.variables,
      );
      if (rendered !== null) {
        return {
          success: true,
          rendered,
        };
      }
      return {
        success: false,
        error: `Template ${id} not found`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to render template',
      };
    }
  }

  @Post('import')
  async importTemplate(@Body() templateData: any) {
    try {
      const templateId =
        await this.templateService.importTemplate(templateData);
      return {
        success: true,
        templateId,
        message: `Template ${templateId} imported successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to import template',
      };
    }
  }

  @Get(':id/validate')
  async validateTemplate(@Param('id') id: string) {
    try {
      const validation = await this.agentFactoryService.validateTemplate(id);
      return {
        success: true,
        templateId: id,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        templateId: id,
        error: error.message || 'Failed to validate template',
      };
    }
  }
}
