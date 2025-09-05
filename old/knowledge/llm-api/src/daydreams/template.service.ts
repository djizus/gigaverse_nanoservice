import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TemplateVariable {
  name: string;
  description: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  model_type?: string;
  model_id?: string;
  instructions: string;
  contexts?: string[];
  context_args?: Record<string, any>;
  // capabilities?: string[];
  variables: TemplateVariable[];
  example_prompts?: string[];
  tags?: string[];
  version?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class TemplateService {
  private supabase: SupabaseClient;
  private initialized = false;
  private inMemoryTemplates = new Map<string, Template>(); // Fallback storage

  constructor() {
    this.initializeSupabase();
    this.initializeDefaultTemplates();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        'Supabase credentials not found, falling back to in-memory storage',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initialized = true;
    console.log('Supabase initialized successfully');
  }

  private initializeDefaultTemplates() {
    // Add some default templates
    const defaultTemplates: Template[] = [
      {
        id: 'assistant-general',
        name: 'General Assistant',
        description: 'A versatile AI assistant to answer general questions',
        instructions: `You are a helpful and kind AI assistant. Your role is to help the user by answering their questions clearly and accurately.

{{instruction}}

Previous conversation:
{{conversation}}

User: {{message}}
Assistant:`,
        variables: [
          {
            name: 'instruction',
            description: 'Specific instructions for this conversation',
            defaultValue: 'Help the user with their request.',
          },
          {
            name: 'conversation',
            description: 'Conversation history',
            defaultValue: '',
          },
          {
            name: 'message',
            description: 'Current user message',
            required: true,
          },
        ],
      },
      {
        id: 'code-assistant',
        name: 'Code Assistant',
        description: 'Specialized in development and programming assistance',
        instructions: `You are an expert in programming and software development. You help developers with their code, debugging, and best practices.

Main programming language: {{language}}
{{instruction}}

Previous conversation:
{{conversation}}

User: {{message}}
Assistant:`,
        variables: [
          {
            name: 'language',
            description: 'Main programming language',
            defaultValue: 'JavaScript',
          },
          {
            name: 'instruction',
            description: 'Specific instructions for this code session',
            defaultValue: 'Help with code and best practices.',
          },
          {
            name: 'conversation',
            description: 'Conversation history',
            defaultValue: '',
          },
          {
            name: 'message',
            description: 'Current user message',
            required: true,
          },
        ],
      },
      {
        id: 'creative-writer',
        name: 'Creative Writer',
        description: 'Assistant specialized in creative and literary writing',
        instructions: `You are a talented creative writer. You help with writing, storytelling, and improving literary style.

Writing style: {{style}}
Genre: {{genre}}
{{instruction}}

Previous conversation:
{{conversation}}

User: {{message}}
Assistant:`,
        variables: [
          {
            name: 'style',
            description: 'Desired writing style',
            defaultValue: 'Narrative',
          },
          {
            name: 'genre',
            description: 'Literary genre',
            defaultValue: 'Fiction',
          },
          {
            name: 'instruction',
            description: 'Specific writing instructions',
            defaultValue: 'Help with creative writing.',
          },
          {
            name: 'conversation',
            description: 'Conversation history',
            defaultValue: '',
          },
          {
            name: 'message',
            description: 'Current user message',
            required: true,
          },
        ],
      },
    ];

    defaultTemplates.forEach(template => {
      this.inMemoryTemplates.set(template.id, {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    console.log(
      `Initialized with ${defaultTemplates.length} default templates`,
    );
  }

  async getAllTemplates(): Promise<Template[]> {
    if (!this.initialized) {
      console.log('Using in-memory storage for template retrieval');
      return Array.from(this.inMemoryTemplates.values());
    }

    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        return Array.from(this.inMemoryTemplates.values());
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllTemplates:', error);
      return Array.from(this.inMemoryTemplates.values());
    }
  }

  async getTemplateById(id: string): Promise<Template | null> {
    if (!this.initialized) {
      return this.inMemoryTemplates.get(id) || null;
    }

    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return this.inMemoryTemplates.get(id) || null;
        }
        console.error('Error fetching template:', error);
        return this.inMemoryTemplates.get(id) || null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      return this.inMemoryTemplates.get(id) || null;
    }
  }

  async createTemplate(template: Template): Promise<string> {
    if (!this.initialized) {
      // Fallback to in-memory storage
      console.log('Using in-memory storage for template creation');
      const templateData = {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.inMemoryTemplates.set(template.id, templateData);
      return template.id;
    }

    try {
      const templateData = {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('templates')
        .insert(templateData);

      if (error) {
        throw new Error(`Error creating template: ${error.message}`);
      }

      return template.id;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    template: Partial<Template>,
  ): Promise<boolean> {
    if (!this.initialized) {
      console.log('Using in-memory storage for template update');
      const existingTemplate = this.inMemoryTemplates.get(id);
      if (!existingTemplate) {
        return false;
      }
      const updatedTemplate = {
        ...existingTemplate,
        ...template,
        updated_at: new Date().toISOString(),
      };
      this.inMemoryTemplates.set(id, updatedTemplate);
      return true;
    }

    try {
      const updateData = {
        ...template,
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('templates')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      return false;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.initialized) {
      console.log('Using in-memory storage for template deletion');
      return this.inMemoryTemplates.delete(id);
    }

    try {
      const { error } = await this.supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      return false;
    }
  }

  async renderTemplate(
    id: string,
    variables: Record<string, string>,
  ): Promise<string | null> {
    const template = await this.getTemplateById(id);
    if (!template) {
      return null;
    }

    // Combines default values with provided variables
    const allVariables = template.variables.reduce(
      (acc, variable) => {
        acc[variable.name] =
          variables[variable.name] || variable.defaultValue || '';
        return acc;
      },
      {} as Record<string, string>,
    );

    // Simple template rendering with variable substitution
    let renderedContent = template.instructions;
    Object.entries(allVariables).forEach(([key, value]) => {
      renderedContent = renderedContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value,
      );
    });

    return renderedContent;
  }

  // Method to import templates from files (for migration)
  async importTemplate(templateData: any): Promise<string> {
    const template: Template = {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      model_type: templateData.model_type,
      model_id: templateData.model_id,
      instructions: templateData.instructions,
      contexts: templateData.contexts,
      context_args: templateData.context_args,
      // capabilities: templateData.capabilities,
      variables: templateData.variables,
      example_prompts: templateData.example_prompts,
      tags: templateData.tags,
      version: templateData.version || '1.0.0',
    };

    return await this.createTemplate(template);
  }
}
