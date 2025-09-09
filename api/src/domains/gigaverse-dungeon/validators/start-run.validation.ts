import { z } from 'zod';

export const StartRunSchema = z.object({
  playerAddress: z.string().min(1),
  gigaverseToken: z.string().min(1),
  dungeonId: z.number().int().min(1),
  totalRuns: z.number().int().min(1).max(100),
  llmModel: z.string().optional(),
  isJuiced: z.boolean().optional(),
  consumables: z.array(z.any()).optional(),
  gearInstanceIds: z.array(z.string()).optional(),
  user_instructions: z.string().min(1),
});

export type StartRunInput = z.infer<typeof StartRunSchema>;

