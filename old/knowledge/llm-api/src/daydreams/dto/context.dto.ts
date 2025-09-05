export class CreateContextDto {
  id: string;
  name: string;
  description: string;
  defaultArgs?: Record<string, unknown>;
}

export class UpdateContextDto {
  name?: string;
  description?: string;
  defaultArgs?: Record<string, unknown>;
}
