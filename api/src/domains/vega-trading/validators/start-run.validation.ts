import { z } from 'zod';

export const StartRunSchema = z.object({
  symbol: z.string().min(1),
  source: z.enum(['gmx','hyperliquid']).optional(),
  llmModel: z.string().optional(),
  user_instructions: z.string().optional(),
});

export type StartRunInput = z.infer<typeof StartRunSchema>;

