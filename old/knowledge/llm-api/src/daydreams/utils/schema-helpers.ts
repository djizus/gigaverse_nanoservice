import { z } from 'zod';

// Helper function to create schema that's compatible with @daydreamsai/core
export function createSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape) as any;
}

// Re-export z for consistent usage
export { z };
