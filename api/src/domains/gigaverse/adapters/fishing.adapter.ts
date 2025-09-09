import { StateAdapter, DecisionType } from './adapter.interface';
import { buildStrategyContext as buildFishingStrategy, composeFishingPrompt } from '../gigaverse-fishing.prompts';

export class FishingStateAdapter implements StateAdapter {
  id = 'gigaverse-fishing';

  buildSystem(_decision: DecisionType, userInstructions?: string): string {
    // Fishing has a single decision type: slot selection
    return buildFishingStrategy(userInstructions);
  }

  composePrompt(_decision: DecisionType, ctx: any): string {
    const { hand, deck, fishPos, prevFishPos } = ctx || {};
    return composeFishingPrompt({ hand, deck, fishPos, prevFishPos });
  }

  parse(_decision: DecisionType, text: string): any {
    // Parsing requires hand length; caller should handle validation
    return text;
  }

  success(_decision: DecisionType, parsed: any): boolean {
    return typeof parsed === 'number' && Number.isFinite(parsed);
  }
}
