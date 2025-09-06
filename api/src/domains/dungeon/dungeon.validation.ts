import * as z from "zod";

// Validation schemas for dungeon domain
export const DungeonRequestSchema = z.object({
  context: z.string().min(1, "Context instructions for agent are required"),
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address"),
  gigaverseToken: z.string().min(1, "Gigaverse authentication token is required"),
  totalRuns: z.number().int().min(1).max(100, "Total runs must be between 1 and 100"),
  dungeonId: z.number().int().min(1).max(10, "Dungeon ID must be between 1 and 10"),
  isJuiced: z.boolean().optional().default(false),
  consumables: z.array(z.any()).optional().default([]),
  gearInstanceIds: z.array(z.string()).optional().default([]),
  sessionId: z.string().optional().default("default"),
  llmModel: z.string().optional()
});

export const DungeonRunOutputSchema = z.object({
  enemies: z.array(z.string()),
  loot: z.array(z.string()),
  experience: z.number(),
  result: z.string(),
});
