import { context, type ContextState, type AnyAgent } from '@daydreamsai/core';
import { createSchema, z } from '../utils/schema-helpers';

// 1. Define the structure of the persistent memory for this context type
export interface ChatMemory {
  messageHistory: {
    sender: 'user' | 'agent';
    text: string;
    timestamp: number;
  }[];
  userPreferences: Record<string, any>;
  lastInteractionTime: number;
  title: string;
  tags: string[];
  isActive: boolean;
  messageCount: number;
  createdAt: number;
}

// 2. Define types for chat input data
export interface ChatInput {
  type: string;
  data: {
    sessionId: string;
    prompt: string;
    knowledge?: string;
    userId?: string;
  };
}

// 3. Define the Zod schema for arguments needed to identify a specific instance
const chatSchema = createSchema({
  sessionId: z.string().describe('Unique identifier for the chat session'),
  userId: z.string().describe('Identifier for the user in the session'),
  title: z.string().optional().describe('Optional title for this chat session'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Optional tags for categorization'),
  agentInstructions: z
    .string()
    .optional()
    .describe('Custom instructions for this agent'),
  agentName: z.string().optional().describe('Name of the agent'),
  template: z
    .record(z.any())
    .optional()
    .describe('Template variables for instruction substitution'),
});

// 4. Define the context using the `context` function
export const chatContext: any = context<ChatMemory>({
  // Required: A unique identifier string for this *type* of context
  type: 'chat',

  // Required: The Zod schema defining the arguments needed to identify
  // or create a specific *instance* of this context.
  schema: chatSchema,

  // Optional: Function to generate a unique string key for an instance from its arguments.
  // Use this if the 'type' alone isn't unique (e.g., multiple chat sessions).
  // The full instance ID becomes "<type>:<key>" (e.g., "chat:session-xyz").
  key: ({ sessionId }) => sessionId,

  // Optional: Defines the initial structure and default values for the
  // context instance's persistent memory (`ctx.memory`).
  // This runs only if no saved memory exists for this instance.
  create: state => {
    console.log('[chatContext] Creating new memory for session, state:', state);

    // Safe access to state and args
    const args = state?.args || {};
    const sessionId = args.sessionId || 'default';

    console.log(`[chatContext] Creating new memory for session: ${sessionId}`);
    return {
      messageHistory: [],
      userPreferences: {},
      lastInteractionTime: Date.now(),
      title: args.title || 'New Chat',
      tags: args.tags || [],
      isActive: true,
      messageCount: 0,
      createdAt: Date.now(),
    };
  },

  // Optional: Provides static or dynamic instructions to the LLM *when this context is active*.
  // NOTE: In our system, instructions come from the agent's configuration
  instructions: state => {
    const args = state?.args || {};
    const userId = args.userId || 'user';
    const sessionId = args.sessionId || 'default';
    let agentInstructions =
      args.agentInstructions || 'You are a helpful AI assistant.';
    const agentName = args.agentName || 'Assistant';
    const template = args.template || {};
    const knowledge = args.knowledge || '';

    // Process template variables in instructions
    if (template && Object.keys(template).length > 0) {
      Object.entries(template).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        agentInstructions = agentInstructions.replace(
          new RegExp(placeholder, 'g'),
          String(value),
        );
      });
    }

    const contextInstructions = `You are ${agentName}, chatting with user ${userId} in session ${sessionId}. Be helpful and maintain context from previous messages.`;

    // Add knowledge base information if available
    const knowledgeInstructions = knowledge
      ? `\n\n## Knowledge Base Context:\n${knowledge}`
      : '';

    return `${agentInstructions}\n\n${contextInstructions}${knowledgeInstructions}`;
  },

  // Optional: A description of this context type's purpose.
  description:
    'A chat session with a specific user, maintaining conversation history and preferences.',

  // Optional: Function to format the context's *current memory state* for the LLM prompt.
  // Helps the LLM understand the current situation within this context instance.
  render: state => {
    // state.memory is typed as ChatMemory here
    const recentHistory = state.memory.messageHistory
      .slice(-5) // Show last 5 messages
      .map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`)
      .join('\n');

    return `
## Chat Session: ${state.memory.title} (${state.key})
${state.memory.tags.length ? `Tags: ${state.memory.tags.join(', ')}` : ''}
Messages: ${state.memory.messageCount}
Last Active: ${new Date(state.memory.lastInteractionTime).toLocaleString()}

## Recent Chat History:
${recentHistory || 'No messages yet.'}

## User Preferences:
${
  Object.keys(state.memory.userPreferences).length > 0
    ? JSON.stringify(state.memory.userPreferences, null, 2)
    : 'No preferences set.'
}
    `;
  },

  // --- Optional Lifecycle Hooks & Config ---
  onStep: async (ctx, agent) => {
    // Update last interaction time on each step
    ctx.memory.lastInteractionTime = Date.now();
  },

  onRun: async (ctx, agent) => {
    // Logic that runs after a complete interaction
    agent.logger.info('chatContext', `Completed run for session: ${ctx.id}`);
  },

  shouldContinue: ctx => {
    // Continue processing unless the session is marked as inactive
    return ctx.memory.isActive && ctx.memory.messageCount < 100; // Limit to 100 messages per session
  },

  onError: async (error, ctx, agent) => {
    agent.logger.error('chatContext', `Error in session ${ctx.id}:`, error);
    // You could implement error recovery logic here
  },

  // Optional: Override agent's default model for this context
  // model: mySpecificLLM,

  // Optional: Limit run steps for this context type
  maxSteps: 1,
});
