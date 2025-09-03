import { Context, Next } from "hono";
import { paymentMiddleware } from "x402-hono";
import { PaymentConfig } from "../types/payment";
import { DatabaseService } from "../../infrastructure/database/database.service";
import { PaymentService } from "../../domains/payment/payment.service";
import { DungeonRequestSchema } from "../../domains/dungeon/dungeon.validation";

/**
 * Consolidated middleware that handles:
 * 1. Checking for existing active runs (no payment if found)
 * 2. Calculating pricing for new runs
 * 3. Processing payment via x402
 * All in a single, efficient flow
 */
export const createDungeonProcessingMiddleware = (
  databaseService: DatabaseService,
  paymentConfig: PaymentConfig
) => {
  return async (c: Context, next: Next) => {
    try {
      // Parse request body once
      const body = await c.req.json();
      
      // Validate and extract player info
      const validationResult = DungeonRequestSchema.safeParse(body);
      if (!validationResult.success) {
        // Store body for controller error handling
        c.set('parsedBody', body);
        c.set('validationError', validationResult.error);
        return await next();
      }

      const { playerAddress, dungeonId, totalRuns } = validationResult.data;
      
      // === STEP 1: Check for ANY existing active runs (Gigaverse allows only one action at a time) ===
      const activeRunResult = await databaseService.getActiveRunForPlayer(playerAddress);
      
      if (activeRunResult.success && activeRunResult.data) {
        const existingRun = activeRunResult.data;
        
        // Check if it's the same dungeon type or a different one
        const isDifferentDungeon = existingRun.dungeon_id !== dungeonId;
        
        if (isDifferentDungeon) {
          console.log(`⚠️  Player ${playerAddress} has active run in dungeon ${existingRun.dungeon_id}`);
          console.log(`   Cannot start dungeon ${dungeonId} - Gigaverse allows only one action at a time`);
        } else {
          console.log(`♻️  Found existing active run ${existingRun.id} for player ${playerAddress}`);
        }
        
        console.log(`   Progress: ${existingRun.completed_runs}/${existingRun.total_runs} runs`);
        
        // Skip payment and return existing run info
        c.set('parsedBody', body);
        c.set('existingRun', existingRun);
        c.set('skipPayment', true);
        c.set('isDifferentDungeon', isDifferentDungeon);
        
        return await next();
      }
      
      // === STEP 2: Calculate pricing for new run ===
      console.log(`🆕 No active run found for player ${playerAddress}, processing new request`);
      
      // Normalize runs field
      const normalizedBody = { ...body, runs: totalRuns, totalRuns };
      const pricingResult = PaymentService.createPricingContext(normalizedBody);
      
      // Check if pricing validation failed
      if ('error' in pricingResult) {
        return c.json({ 
          error: pricingResult.error,
          maxRuns: pricingResult.maxRuns,
          pricePerRun: "$0.01",
          maxPayment: "$20.00",
          suggestion: `Try ${pricingResult.maxRuns} runs or fewer (maximum $20.00 payment allowed)`
        }, 400);
      }
      
      PaymentService.logPricing('dungeon', pricingResult);
      
      // === STEP 3: Process payment for new run ===
      const priceString = pricingResult.priceString;
      
      // Create dynamic payment middleware with calculated price
      const dynamicPaymentMiddleware = paymentMiddleware(
        paymentConfig.address as `0x${string}`,
        {
          '/dungeon': {
            price: priceString,
            network: paymentConfig.network,
          },
        },
        {
          url: paymentConfig.facilitatorUrl,
        }
      );
      
      // Store context for controller
      c.set('parsedBody', pricingResult.parsedBody);
      c.set('runs', pricingResult.runs);
      c.set('totalPrice', pricingResult.totalPrice);
      c.set('priceString', priceString);
      c.set('skipPayment', false);
      
      // Execute payment middleware
      return dynamicPaymentMiddleware(c, next);
      
    } catch (error) {
      console.error("Error in dungeon processing middleware:", error);
      return c.json({ 
        error: "Failed to process request",
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  };
};