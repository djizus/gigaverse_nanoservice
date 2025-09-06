export type DungeonEventV1 =
  | { version: 'v1'; type: 'run_started'; runId: string; timestamp: string; playerAddress?: string; dungeonId?: number; llmModel?: string; context?: string; totalRuns?: number }
  | { version: 'v1'; type: 'room_entered'; runId: string; timestamp: string; room: number; enemy: number; playerHP?: number; enemyHP?: number }
  | { version: 'v1'; type: 'combat_move'; runId: string; timestamp: string; move: 'rock' | 'paper' | 'scissor' }
  | { version: 'v1'; type: 'battle_result'; runId: string; timestamp: string; result: 'win' | 'lose' | 'draw' | 'ongoing'; playerHP?: number; enemyHP?: number }
  | { version: 'v1'; type: 'loot_phase'; runId: string; timestamp: string; options: any[] }
  | { version: 'v1'; type: 'loot_selected'; runId: string; timestamp: string; loot: 'loot_one'|'loot_two'|'loot_three'|'loot_four'; itemsGained?: number }
  | { version: 'v1'; type: 'agent_decision_move'; runId: string; timestamp: string; move: 'rock'|'paper'|'scissor'; reason: string }
  | { version: 'v1'; type: 'agent_decision_loot'; runId: string; timestamp: string; loot: 'loot_one'|'loot_two'|'loot_three'|'loot_four'; reason: string }
  | { version: 'v1'; type: 'run_completed'; runId: string; timestamp: string; status: 'completed'|'died'; roomsCleared?: number; battlesWon?: number; battlesLost?: number; itemsGained?: number }
  | { version: 'v1'; type: 'all_runs_completed'; runId: string; timestamp: string; completedRuns: number; totalRuns: number; successRate?: number }
  | { version: 'v1'; type: 'error'; runId: string; timestamp: string; code?: string; message: string }
  | { version: 'v1'; type: 'done'; runId: string; timestamp: string };

