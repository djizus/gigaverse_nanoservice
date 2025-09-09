export const uiSchema = {
  fields: [
    { id: 'gameId', label: 'Game ID', type: 'number', required: true },
    { id: 'llmModel', label: 'Model (optional)', type: 'text' },
    { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: false, default: 'Analyze the state and suggest next actions.' },
  ]
};

