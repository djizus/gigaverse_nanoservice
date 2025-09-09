import { z } from 'zod';

export const StartRunSchema = z.object({
  gameId: z.number().int().min(1),
  llmModel: z.string().optional(),
  user_instructions: z.string().optional(),
});

export type StartRunInput = z.infer<typeof StartRunSchema>;

