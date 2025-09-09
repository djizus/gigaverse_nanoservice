import { z } from 'zod';

export const ContextSchema = z.object({
  gameId: z.number().int().min(1),
});

export type ContextInput = z.infer<typeof ContextSchema>;

