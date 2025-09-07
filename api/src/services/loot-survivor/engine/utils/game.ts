// Minimal game utils for LS engine
export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(Math.max(0, xp || 0)));
};

export const calculateNextLevelXP = (currentLevel: number, item: boolean = false): number => {
  if (item) {
    return Math.min(400, (currentLevel + 1) ** 2);
  }
  return (currentLevel + 1) ** 2;
};

export const elementalAdjustedDamage = (base_attack: number, weapon_type: string, armor_type: string): number => {
  const elemental_effect = Math.floor(base_attack / 2);
  if (
    (weapon_type === 'Magic' && armor_type === 'Cloth') ||
    (weapon_type === 'Blade' && armor_type === 'Hide') ||
    (weapon_type === 'Bludgeon' && armor_type === 'Metal')
  ) {
    return base_attack + elemental_effect;
  }
  if (
    (weapon_type === 'Magic' && armor_type === 'Hide') ||
    (weapon_type === 'Blade' && armor_type === 'Metal') ||
    (weapon_type === 'Bludgeon' && armor_type === 'Cloth')
  ) {
    return base_attack - elemental_effect;
  }
  return base_attack;
};

export const ability_based_percentage = (adventurer_xp: number, relevant_stat: number): number => {
  const adventurer_level = calculateLevel(adventurer_xp);
  if (relevant_stat >= adventurer_level) return 100;
  return Math.floor((relevant_stat / Math.max(1, adventurer_level)) * 100);
};

export const calculateFleeChance = (adventurerLevel: number, dexterity: number): number => {
  if (dexterity >= adventurerLevel) return 100;
  return Math.floor((dexterity / Math.max(1, adventurerLevel)) * 100);
};

export const calculateAmbushChance = (adventurerLevel: number, wisdom: number): number => {
  if (wisdom >= adventurerLevel) return 100;
  return Math.floor((wisdom / Math.max(1, adventurerLevel)) * 100);
};

