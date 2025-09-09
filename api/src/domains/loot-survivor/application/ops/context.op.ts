import { ContextInput } from '../../loot-survivor/validators/context.validation';
import { GameStateService, GameStateConfig } from '../../../../services/loot-survivor/engine/GameStateService';
import { ContextEngine } from '../../../../services/loot-survivor/engine/ContextEngine';

export async function contextOp(cfg: GameStateConfig, data: ContextInput) {
  const engine = new GameStateService(cfg);
  const ctxEngine = new ContextEngine();
  const state = await engine.getGameState(data.gameId);
  const ctx = ctxEngine.generateContext(state);
  const inline = ctx.content.replace(/\n\s*/g, '');
  return { content: inline, tokens: ctx.tokens };
}

