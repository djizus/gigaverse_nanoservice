import { input, formatMsg } from '@daydreamsai/core';
import { createSchema, z } from '../utils/schema-helpers';
import { chatContext } from '../context/chat.context';

export const apiInput = input({
  schema: createSchema({
    sessionId: z.string(),
    userId: z.string().default('user'),
    prompt: z.string(),
    knowledge: z.string().optional(),
  }),

  format: inputRef => {
    // If knowledge is available, include it in the prompt
    const content = inputRef.data.knowledge
      ? `[Contexte: ${inputRef.data.knowledge}]\n\nQuestion: ${inputRef.data.prompt}`
      : inputRef.data.prompt;

    return formatMsg({
      role: 'user',
      content,
      user: inputRef.data.userId,
    });
  },

  subscribe() {
    // Pas besoin d'abonnement pour une API
    return () => {};
  },
});
