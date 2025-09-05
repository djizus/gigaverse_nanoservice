export class CreateContextTemplateDto {
  id: string;
  name: string;
  description: string;
  content?: string;
  contextType: string;
  defaultArgs?: Record<string, unknown>;
}

export class UpdateContextTemplateDto {
  name?: string;
  description?: string;
  content?: string;
  contextType?: string;
  defaultArgs?: Record<string, unknown>;
}
