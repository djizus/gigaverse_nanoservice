import { Hono } from "hono";
import { DungeonController } from "../../domains/dungeon/dungeon.controller";
import { createDungeonProcessingMiddleware } from "../../shared/middleware/dungeon-processing.middleware";
import { PaymentConfig } from "../../shared/types/payment";
import { DatabaseService } from "../../infrastructure/database/database.service";

export const createGameRoutes = (
  dungeonController: DungeonController,
  paymentConfig: PaymentConfig,
  databaseService: DatabaseService
) => {
  const app = new Hono();

  // Single consolidated middleware handles everything: active run check, pricing, and payment
  app.use("/dungeon", createDungeonProcessingMiddleware(databaseService, paymentConfig));
  app.post("/dungeon", (c) => dungeonController.executeDungeon(c));

  return app;
};