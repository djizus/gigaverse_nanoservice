export type DecisionType = 'move' | 'loot' | 'slot';

export interface StateAdapter {
  id: string;
  buildSystem(decision: DecisionType, userInstructions?: string): string;
  composePrompt(decision: DecisionType, ctx: any): string;
  parse(decision: DecisionType, text: string): any;
  success(decision: DecisionType, parsed: any): boolean;
}

