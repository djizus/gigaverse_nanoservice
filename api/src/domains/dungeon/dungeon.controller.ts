import { Context } from "hono";
import { DungeonService } from './dungeon.service';
import { DungeonRequestSchema } from './dungeon.validation';
import { DungeonRequest, DungeonRunResponse } from './dungeon.types';

export class DungeonController {
  constructor(private dungeonService: DungeonService) {}

  async executeDungeon(c: Context) {
    try {
      // Check if validation failed
      const validationError = c.get('validationError');
      if (validationError) {
        return c.json({ 
          error: "Invalid request", 
          details: validationError.errors 
        }, 400);
      }

      // Check if we're returning an existing run (no payment)
      const existingRun = c.get('existingRun');
      if (existingRun) {
        const isDifferentDungeon = c.get('isDifferentDungeon');
        
        if (isDifferentDungeon) {
          console.log(`⚠️  Player is busy in dungeon ${existingRun.dungeon_id}, blocking request`);
          
          return c.json({
            error: 'Player busy in another dungeon',
            message: `You have an active run in dungeon ${existingRun.dungeon_id}. Complete it before starting dungeon ${c.get('parsedBody').dungeonId}. Gigaverse allows only one action at a time.`,
            activeRun: {
              runId: existingRun.id,
              dungeonId: existingRun.dungeon_id,
              progress: `${existingRun.completed_runs}/${existingRun.total_runs} runs`,
              status: existingRun.status,
              subscription: `Subscribe to table 'run_events' with filter 'dungeon_run_id=eq.${existingRun.id}'`
            },
            payment: {
              charged: false,
              reason: 'Cannot start - player busy in different dungeon'
            }
          }, 409); // 409 Conflict
        } else {
          console.log(`♻️  Returning existing run ${existingRun.id} without charging`);
          
          return c.json({
            runId: existingRun.id,
            status: 'existing',
            message: `Active dungeon run already in progress! ${existingRun.completed_runs}/${existingRun.total_runs} runs completed. Subscribe to runId: ${existingRun.id}`,
            progress: {
              totalRuns: existingRun.total_runs,
              completedRuns: existingRun.completed_runs,
              status: existingRun.status
            },
            payment: {
              charged: false,
              reason: 'Existing active run found'
            },
            instructions: {
              message: "Subscribe to real-time updates using the existing runId",
              subscription: `Subscribe to table 'run_events' with filter 'dungeon_run_id=eq.${existingRun.id}'`
            }
          });
        }
      }
      
      // Process new run (payment already handled by middleware)
      const body = c.get('parsedBody');
      const totalRuns = c.get('runs');
      const totalPrice = c.get('totalPrice');
      const priceString = c.get('priceString');
      
      console.log(`💰 Processing new dungeon request for ${totalRuns} runs at ${priceString}`);
      
      // Merge body with totalRuns from middleware
      const requestData = {
        ...body,
        totalRuns // Override with the validated runs from middleware
      };
      
      // Validate complete request
      const validationResult = DungeonRequestSchema.safeParse(requestData);
      if (!validationResult.success) {
        return c.json({ 
          error: "Invalid request", 
          details: validationResult.error.issues 
        }, 400);
      }

      const dungeonRequest: DungeonRequest = validationResult.data;
      
      // Start dungeon runs (returns immediately with runId)
      const response: DungeonRunResponse = await this.dungeonService.startDungeonRuns(dungeonRequest);
      
      // Add payment info to response
      const enrichedResponse = {
        ...response,
        payment: {
          totalPrice,
          pricePerRun: 0.01,
          currency: 'USD'
        },
        instructions: {
          message: "Subscribe to real-time updates using the runId",
          subscription: `Subscribe to table 'run_events' with filter 'dungeon_run_id=eq.${response.runId}'`
        }
      };
      
      return c.json(enrichedResponse);

    } catch (error) {
      console.error("Error processing dungeon request:", error);
      
      // Extract error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return c.json({ 
        success: false,
        error: "Failed to process dungeon request",
        message: errorMessage
      }, 500);
    }
  }
}
