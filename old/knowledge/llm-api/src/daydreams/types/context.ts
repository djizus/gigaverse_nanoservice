import { AnyContext } from '@daydreamsai/core';
import { TemplateVariable } from '../template.service';

export interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  content?: string;
  variables?: TemplateVariable[];
  context: AnyContext;
  defaultArgs?: Record<string, unknown>;
}

export interface CreateContextDto {
  id: string;
  name: string;
  description: string;
  defaultArgs?: Record<string, unknown>;
}

export interface UpdateContextDto {
  name?: string;
  description?: string;
  defaultArgs?: Record<string, unknown>;
}
