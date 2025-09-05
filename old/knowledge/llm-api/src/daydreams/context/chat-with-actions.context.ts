import { chatContext } from './chat.context';
import { chatActions } from '../actions/chat-actions';
import { apiInput } from '../inputs/chat.input';
import { chatOutput } from '../outputs/chat.output';

// Associate actions with the chat context using the chained method
// This provides better organization and ensures components have typed access to the correct context memory
export const chatContextWithActions: any = chatContext
  .setActions([...chatActions])
  .setInputs({
    chat: apiInput,
  })
  .setOutputs({
    'chat:response': chatOutput,
  });

// Now, within any action handler, ctx.memory will be typed as ChatMemory
// and the actions will only be available when chatContext is active.

// Export for easy access
export { chatContext } from './chat.context';
export { chatActions } from '../actions/chat-actions';
export type { ChatMemory, ChatInput } from './chat.context';
