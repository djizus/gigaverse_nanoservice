export const uiSchema = {
  fields: [
    { id: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: 'e.g., BTC-USD' },
    { id: 'source', label: 'Data Source', type: 'select', required: false, options: ['gmx','hyperliquid'], default: 'gmx' },
    { id: 'llmModel', label: 'Model', type: 'text', required: false, default: 'google-vertex/gemini-2.5-flash' },
    { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: false, default: 'Be conservative. Only signal when confidence > 60%.' },
  ]
};

