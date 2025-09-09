import { z } from 'zod';

export const StartRunSchema = z.object({
  playerAddress: z.string().min(1),
  gigaverseToken: z.string().min(1),
  runType: z.enum(['small','normal','big']),
  totalRuns: z.number().int().min(1).max(100),
  llmModel: z.string().optional(),
  user_instructions: z.string().optional(),
});

export type StartRunInput = z.infer<typeof StartRunSchema>;

