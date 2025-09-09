export const uiSchema = {
  fields: [
    { id: 'playerAddress', label: 'Player Address', type: 'text', required: true },
    { id: 'gigaverseToken', label: 'Gigaverse Token', type: 'textarea', required: true },
    { id: 'dungeonId', label: 'Dungeon', type: 'number', required: true, min: 1, max: 10 },
    { id: 'totalRuns', label: 'Runs', type: 'number', required: true, min: 1, max: 100, default: 1 },
    { id: 'llmModel', label: 'Model', type: 'text', required: false, default: 'google-vertex/gemini-2.5-flash' },
    { id: 'isJuiced', label: 'Juiced', type: 'checkbox', required: false, default: false },
    { id: 'user_instructions', label: 'User Instructions', type: 'textarea', required: true, default: 'Be aggressive in combat.\nPrioritize attack and armor upgrades when looting, but loot heal when you are below 50% health.'}
  ]
};

