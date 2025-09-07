// Copied minimal constants for Loot Survivor engine
export const BEAST_SPECIAL_NAME_LEVEL_UNLOCK = 19;
export const MAX_SPECIAL2 = BigInt(69);
export const MAX_SPECIAL3 = BigInt(18);
export const MAX_BEAST_ID = BigInt(75);

export const STARTER_BEAST_HEALTH = BigInt(3);
export const MAXIMUM_HEALTH = BigInt(1023);
export const BEAST_MIN_DAMAGE = 2;

export const GOLD_MULTIPLIER = { T1: 5, T2: 4, T3: 3, T4: 2, T5: 1 } as const;
export const GOLD_REWARD_DIVISOR = 2;
export const MINIMUM_XP_REWARD = 4;

export const BEAST_NAME_PREFIXES: { [key: number]: string } = {
  1: "Agony", 2: "Apocalypse", 3: "Armageddon", 4: "Beast", 5: "Behemoth",
  6: "Blight", 7: "Blood", 8: "Bramble", 9: "Brimstone", 10: "Brood",
  11: "Carrion", 12: "Cataclysm", 13: "Chimeric", 14: "Corpse", 15: "Corruption",
  16: "Damnation", 17: "Death", 18: "Demon", 19: "Dire", 20: "Dragon",
  21: "Dread", 22: "Doom", 23: "Dusk", 24: "Eagle", 25: "Empyrean",
  26: "Fate", 27: "Foe", 28: "Gale", 29: "Ghoul", 30: "Gloom",
  31: "Glyph", 32: "Golem", 33: "Grim", 34: "Hate", 35: "Havoc",
  36: "Honour", 37: "Horror", 38: "Hypnotic", 39: "Kraken", 40: "Loath",
  41: "Maelstrom", 42: "Mind", 43: "Miracle", 44: "Morbid", 45: "Oblivion",
  46: "Onslaught", 47: "Pain", 48: "Pandemonium", 49: "Phoenix", 50: "Plague",
  51: "Rage", 52: "Rapture", 53: "Rune", 54: "Skull", 55: "Sol",
  56: "Soul", 57: "Sorrow", 58: "Spirit", 59: "Storm", 60: "Tempest",
  61: "Torment", 62: "Vengeance", 63: "Victory", 64: "Viper", 65: "Vortex",
  66: "Woe", 67: "Wrath", 68: "Lights", 69: "Shimmering"
};

export const BEAST_NAME_SUFFIXES: { [key: number]: string } = {
  1: "Bane", 2: "Root", 3: "Bite", 4: "Song", 5: "Roar", 6: "Grasp",
  7: "Instrument", 8: "Glow", 9: "Bender", 10: "Shadow", 11: "Whisper",
  12: "Shout", 13: "Growl", 14: "Tear", 15: "Peak", 16: "Form", 17: "Sun", 18: "Moon"
};

export const BEAST_NAMES: { [key: number]: string } = {
  1: "Warlock", 2: "Mage", 3: "Sorcerer", 4: "Elemental", 5: "Enchanter",
  6: "Blade Dancer", 7: "Swordsman", 8: "Duelist", 9: "Assassin", 10: "Rogue",
  11: "Giant", 12: "Troll", 13: "Ogre", 14: "Golem", 15: "Colossus",
  16: "Archmage", 17: "Spellbinder", 18: "Conjurer", 19: "Illusionist", 20: "Warlock King",
  21: "Warlord", 22: "Champion", 23: "Blademaster", 24: "Myrmidon", 25: "Gladiator",
  26: "Titan", 27: "Stoneborn", 28: "Juggernaut", 29: "Sentinel", 30: "Guardian",
  31: "High Mage", 32: "Runesmith", 33: "Stormcaller", 34: "Flameshaper", 35: "Frostweaver",
  36: "Sword Saint", 37: "Warmonger", 38: "Warlord Elite", 39: "Dragoon", 40: "Vanguard",
  41: "Leviathan", 42: "Behemoth", 43: "World Eater", 44: "Mountain King", 45: "Ancient",
  46: "Arch Sorcerer", 47: "Voidwalker", 48: "Eldritch", 49: "Nethermancer", 50: "Celestial",
  51: "Blade Titan", 52: "War Colossus", 53: "Steelbreaker", 54: "Ironlord", 55: "Dreadnought",
  56: "Primordial", 57: "Worldshaper", 58: "Cataclysm", 59: "Skybreaker", 60: "Earthshaker",
  61: "Mythic Mage", 62: "Eternal Sage", 63: "Arcane Sovereign", 64: "Chronomancer", 65: "Starseer",
  66: "Sword Immortal", 67: "Wargod", 68: "War Emperor", 69: "Dragon Knight", 70: "Blade Emperor",
  71: "Eternal Colossus", 72: "World Titan", 73: "Heavenbreaker", 74: "Elder Guardian", 75: "Ancient Sentinel"
};

