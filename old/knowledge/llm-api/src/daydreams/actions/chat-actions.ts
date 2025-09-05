import { action } from '@daydreamsai/core';
import { createSchema, z } from '../utils/schema-helpers';
import type { ChatMemory } from '../context/chat.context';

// Action to add a message to chat history
export const addToChatHistoryAction = action({
  name: 'addToChatHistory',
  description: 'Add a new message to the chat history',
  schema: createSchema({
    sender: z.enum(['user', 'agent']).describe('Who sent the message'),
    text: z.string().describe('The message content'),
    timestamp: z
      .number()
      .optional()
      .describe('Optional timestamp (defaults to now)'),
  }),
  handler(args, ctx, agent) {
    console.log('=== addToChatHistoryAction DEBUG ===');
    console.log('args:', args);
    console.log('ctx:', ctx);
    console.log('agent:', !!agent);

    // Handle the case where this action is called automatically by the framework
    // In such cases, args and ctx might be undefined, but we should not fail
    if (!args || !ctx) {
      console.log(
        '[DEBUG] Missing args or context - likely automatic framework call',
      );
      console.log(
        '[DEBUG] This is normal behavior for framework-managed chat history',
      );

      // Return success without error to allow the agent flow to continue
      return {
        success: true,
        message: 'Chat history managed by framework',
        note: 'Framework automatically manages chat history',
      };
    }

    // Validate required fields when we have args
    if (!args.sender || !args.text) {
      console.log('[DEBUG] Missing required fields in args:', {
        sender: args.sender,
        text: !!args.text,
      });
      return {
        success: false,
        message: 'Missing required fields: sender and text are required',
        received: args,
      };
    }

    console.log(
      '[DEBUG] Valid args and ctx received, proceeding with manual chat history addition',
    );

    try {
      // Proceed with normal action logic when we have valid args and context
      const contextMemory = ctx.memory as ChatMemory;
      const timestamp = args.timestamp || Date.now();

      // Add message to history
      const message = {
        sender: args.sender,
        text: args.text,
        timestamp: timestamp,
      };

      contextMemory.messageHistory.push(message);
      contextMemory.messageCount = contextMemory.messageHistory.length;
      contextMemory.lastInteractionTime = timestamp;

      if (agent?.logger) {
        agent.logger.info(
          'addToChatHistory',
          `Added ${args.sender} message to session ${ctx.id}`,
        );
      }

      return {
        success: true,
        message: 'Message added to chat history',
        messageCount: contextMemory.messageCount,
      };
    } catch (error) {
      console.error('[ERROR] Failed to add message to chat history:', error);
      return {
        success: false,
        message: 'Failed to add message to chat history',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Action to clear chat history
export const clearChatHistoryAction = action({
  name: 'clearChatHistory',
  description: 'Clear all messages from the chat history',
  schema: createSchema({
    keepCount: z
      .number()
      .optional()
      .describe('Number of recent messages to keep (default: 0)'),
  }),
  handler(args, ctx, agent) {
    const contextMemory = ctx.memory as ChatMemory;
    const keepCount = args.keepCount || 0;

    // Store the messages to keep
    const messagesToKeep =
      keepCount > 0 ? contextMemory.messageHistory.slice(-keepCount) : [];

    // Clear history
    contextMemory.messageHistory = messagesToKeep;
    contextMemory.messageCount = messagesToKeep.length;
    contextMemory.lastInteractionTime = Date.now();

    agent.logger.info(
      'clearChatHistory',
      `Cleared chat history for session ${ctx.id}, kept ${keepCount} messages`,
    );

    return {
      success: true,
      message: `Chat history cleared, kept ${keepCount} messages`,
      messageCount: contextMemory.messageCount,
    };
  },
});

// Action to update user preferences
export const updateUserPreferencesAction = action({
  name: 'updateUserPreferences',
  description: 'Update user preferences for this chat session',
  schema: createSchema({
    preferences: z
      .record(z.any())
      .describe('Key-value pairs of user preferences'),
    merge: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to merge with existing preferences or replace'),
  }),
  handler(args, ctx, agent) {
    const contextMemory = ctx.memory as ChatMemory;

    if (args.merge) {
      // Merge with existing preferences
      contextMemory.userPreferences = {
        ...contextMemory.userPreferences,
        ...args.preferences,
      };
    } else {
      // Replace preferences entirely
      contextMemory.userPreferences = args.preferences;
    }

    contextMemory.lastInteractionTime = Date.now();

    agent.logger.info(
      'updateUserPreferences',
      `Updated user preferences for session ${ctx.id}`,
    );

    return {
      success: true,
      message: 'User preferences updated',
      preferences: contextMemory.userPreferences,
    };
  },
});

// Action to update session metadata
export const updateSessionMetadataAction = action({
  name: 'updateSessionMetadata',
  description: 'Update session title, tags, or activity status',
  schema: createSchema({
    title: z.string().optional().describe('New session title'),
    tags: z.array(z.string()).optional().describe('New session tags'),
    isActive: z.boolean().optional().describe('Whether the session is active'),
  }),
  handler(args, ctx, agent) {
    const contextMemory = ctx.memory as ChatMemory;

    // Update metadata fields if provided
    if (args.title !== undefined) {
      contextMemory.title = args.title;
    }
    if (args.tags !== undefined) {
      contextMemory.tags = args.tags;
    }
    if (args.isActive !== undefined) {
      contextMemory.isActive = args.isActive;
    }

    contextMemory.lastInteractionTime = Date.now();

    agent.logger.info(
      'updateSessionMetadata',
      `Updated session metadata for ${ctx.id}`,
    );

    return {
      success: true,
      message: 'Session metadata updated',
      metadata: {
        title: contextMemory.title,
        tags: contextMemory.tags,
        isActive: contextMemory.isActive,
      },
    };
  },
});

// Action to get session statistics
export const getSessionStatsAction = action({
  name: 'getSessionStats',
  description: 'Get statistics about the current chat session',
  schema: createSchema({}), // No input parameters needed
  handler(args, ctx, agent) {
    const contextMemory = ctx.memory as ChatMemory;

    const stats = {
      sessionId: ctx.id,
      title: contextMemory.title,
      messageCount: contextMemory.messageCount,
      createdAt: new Date(contextMemory.createdAt).toISOString(),
      lastActive: new Date(contextMemory.lastInteractionTime).toISOString(),
      isActive: contextMemory.isActive,
      tags: contextMemory.tags,
      userPreferencesCount: Object.keys(contextMemory.userPreferences).length,
      sessionDuration: Date.now() - contextMemory.createdAt,
    };

    agent.logger.info(
      'getSessionStats',
      `Retrieved stats for session ${ctx.id}`,
    );

    return {
      success: true,
      stats,
    };
  },
});

// Export all actions as an array for easy registration
export const chatActions = [
  addToChatHistoryAction,
  clearChatHistoryAction,
  updateUserPreferencesAction,
  updateSessionMetadataAction,
  getSessionStatsAction,
];
