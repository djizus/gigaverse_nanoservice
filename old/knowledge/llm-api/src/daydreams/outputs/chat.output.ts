// src/daydreams/outputs/chat.output.ts
import { createSchema, z } from '../utils/schema-helpers';
import { output } from '@daydreamsai/core';

export const chatOutput = output({
  schema: createSchema({
    content: z.string().min(1, 'Le contenu ne peut pas être vide'),
  }),
  handler: (data: unknown, context: any, agent: any): any => {
    console.log(
      '=== [chat.output.ts] Output Handler called (signature explicite) ===',
    );
    console.log('Data (from schema):', data);
    console.log('Context:', context);
    // console.log("Agent:", agent); // L'agent peut être un objet complexe

    // Patch: si data est une string, tenter de parser en JSON
    let parsedData: any = data;
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch (e) {
        console.error(
          '[ERROR] Output Handler - data is string but not valid JSON!',
          { data },
        );
        return {
          content:
            'Erreur de traitement interne: Données de réponse invalides (JSON).',
        };
      }
    }

    if (!parsedData || typeof parsedData.content === 'undefined') {
      console.error(
        "[ERROR] Output Handler - 'data' ou 'data.content' est undefined!",
        { data },
      );
      return {
        content: 'Erreur de traitement interne: Données de réponse invalides.',
      };
    }

    // Retourner directement le contenu validé
    return {
      content: parsedData.content,
    };
  },
});
