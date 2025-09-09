export const uiSchema = {
  fields: [
    { id: 'playerAddress', label: 'Player Address', type: 'text', required: true },
    { id: 'gigaverseToken', label: 'Gigaverse Token', type: 'textarea', required: true },
    { id: 'runType', label: 'Run Type', type: 'select', required: true, options: ['small','normal','big'], default: 'normal' },
    { id: 'totalRuns', label: 'Runs', type: 'number', required: true, min: 1, max: 100, default: 1 },
    { id: 'llmModel', label: 'Model (optional)', type: 'text' },
    { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: false, default: 'Fishing Protocol:\nTurn 1: play wide coverage (8–9 cells) to identify pattern.\nTurns 2+: predict path and play precise cards until capture.\nReturn only a CSV of up to 3 card indices from your current hand.' }
  ]
};

