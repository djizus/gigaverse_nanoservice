import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDreams, LogLevel } from '@daydreamsai/core';
import { chatContextWithActions } from './context/chat-with-actions.context';
import { chatActions } from './actions/chat-actions';
import { apiInput } from './inputs/chat.input';
import { chatOutput } from './outputs/chat.output';

export const DaydreamsAgentProvider: Provider = {
  provide: 'DAYDREAMS_AGENT',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const apiKey = configService.get<string>('ANTHROPIC_API_KEY');

    console.log('[DEBUG] Initializing DaydreamsAgent');

    try {
      const anthropic = createAnthropic({ apiKey });
      console.log('[DEBUG] Anthropic provider created');

      console.log('[DEBUG] Creating Dreams agent');

      // Create agent with createDreams (async function)
      const dreamsInstance = createDreams({
        model: anthropic('claude-3-7-sonnet-latest'),
        contexts: [chatContextWithActions],
        // Actions are now associated with contexts
        actions: [],
        inputs: {
          chat: apiInput,
        },
        outputs: {
          'chat:response': chatOutput,
        },
        logLevel: LogLevel.DEBUG,
      });

      // Start the agent
      const agent = dreamsInstance.start({
        sessionId: 'default-session',
        userId: 'system',
      });

      console.log('[DEBUG] Dreams agent started successfully');
      return agent;
    } catch (error) {
      console.error('[ERROR] Agent creation failed:', error);
      // In case of error, return a fallback agent with send method
      return {
        send: async (request: any) => {
          console.log('[FALLBACK] Using fallback agent');
          return [
            {
              ref: 'output',
              content:
                'The system is experiencing difficulties. Please try again later.',
              type: 'error',
            },
          ];
        },
      };
    }
  },
};
