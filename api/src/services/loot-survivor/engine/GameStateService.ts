import { BEAST_NAMES, BEAST_NAME_PREFIXES, BEAST_NAME_SUFFIXES } from './constants/beast';
import { ItemId, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from './constants/loot';
import { OBSTACLE_NAMES } from './constants/obstacle';
import { elementalAdjustedDamage } from './utils/game';

export interface GameStateConfig {
  toriiUrl: string;
  namespace: string;
}

export class GameStateService {
  constructor(private config: GameStateConfig) {}

  async getGameState(gameId: number): Promise<GameState> {
    const hexId = '0x' + gameId.toString(16).padStart(16, '0');
    const query = `
      SELECT * FROM "${this.config.namespace}-GameEvent"
      WHERE adventurer_id = '${hexId}'
      ORDER BY action_count DESC
      LIMIT 1
    `;
    const result = await this.sql<any[]>(query);
    const row = result[0];
    if (!row) throw new Error(`Game ${gameId} not found`);
    return this.mapRowToGameState(row, gameId);
  }

  private mapRowToGameState(row: any, gameId: number): GameState {
    const state: GameState = {
      gameId,
      actionCount: row.action_count || 0,
      phase: this.determinePhase(row),
      adventurer: {
        id: gameId,
        health: row['details.adventurer.health'] || 0,
        xp: row['details.adventurer.xp'] || 0,
        level: Math.floor(Math.sqrt(row['details.adventurer.xp'] || 0)),
        gold: row['details.adventurer.gold'] || 0,
        beastHealth: row['details.adventurer.beast_health'] || 0,
        statUpgradesAvailable: row['details.adventurer.stat_upgrades_available'] || 0,
        stats: {
          strength: row['details.adventurer.stats.strength'] || 0,
          dexterity: row['details.adventurer.stats.dexterity'] || 0,
          vitality: row['details.adventurer.stats.vitality'] || 0,
          intelligence: row['details.adventurer.stats.intelligence'] || 0,
          wisdom: row['details.adventurer.stats.wisdom'] || 0,
          charisma: row['details.adventurer.stats.charisma'] || 0,
          luck: row['details.adventurer.stats.luck'] || 0,
        },
        equipment: {
          weapon: this.parseItem(row, 'weapon', row['details.adventurer.item_specials_seed']),
          chest: this.parseItem(row, 'chest', row['details.adventurer.item_specials_seed']),
          head: this.parseItem(row, 'head', row['details.adventurer.item_specials_seed']),
          waist: this.parseItem(row, 'waist', row['details.adventurer.item_specials_seed']),
          foot: this.parseItem(row, 'foot', row['details.adventurer.item_specials_seed']),
          hand: this.parseItem(row, 'hand', row['details.adventurer.item_specials_seed']),
          neck: this.parseItem(row, 'neck', row['details.adventurer.item_specials_seed']),
          ring: this.parseItem(row, 'ring', row['details.adventurer.item_specials_seed']),
        },
      },
      beast: this.parseBeast(row),
      bag: this.parseBag(row, row['details.adventurer.item_specials_seed']),
      market: this.parseMarket(row),
    };
    if (state.beast) state.combatPreview = this.calculateCombatPreview(state.adventurer, state.beast);
    return state;
  }

  private determinePhase(row: any): GamePhase {
    if (row['details.adventurer.health'] <= 0) return 'death';
    if (row['details.adventurer.stat_upgrades_available'] > 0) return 'level_up';
    if ((row['details.adventurer.beast_health'] || 0) > 0) return 'combat';
    return 'exploration';
  }

  private parseItem(row: any, slot: string, seed: number): Item | null {
    const id = row[`details.adventurer.equipment.${slot}`];
    const xp = row[`details.adventurer.equipment.${slot}_xp`];
    if (!id) return null;
    const level = Math.floor(Math.sqrt(xp || 0));
    const item: Item = {
      id,
      xp: xp || 0,
      level,
      name: this.getItemName(id),
      tier: this.getItemTier(id),
      type: this.getItemType(id),
      slot: this.getItemSlot(id),
      prefix: this.getItemPrefix(id, seed),
      suffix: this.getItemSuffix(id, seed),
    };
    return item;
  }

  private parseBeast(row: any): Beast | null {
    const id = row['details.adventurer.beast'];
    const health = row['details.adventurer.beast_health'];
    const level = row['details.adventurer.level'] || 1;
    if (!id || !health) return null;
    const beast: Beast = {
      id,
      health,
      level,
      seed: String(row['details.adventurer.beast_specials_seed'] || '0x0'),
      name: BEAST_NAMES[id] || 'Unknown',
      tier: this.getBeastTier(id),
      type: this.getBeastType(id),
      armorType: this.getBeastArmorType(id),
      prefix: BEAST_NAME_PREFIXES[((row['details.adventurer.beast_specials_seed'] || 0) % 69) + 1],
      suffix: BEAST_NAME_SUFFIXES[((row['details.adventurer.beast_specials_seed'] || 0) % 18) + 1],
    };
    return beast;
  }

  private parseBag(row: any, seed: number): Item[] {
    const items: Item[] = [];
    for (let i = 1; i <= 32; i++) {
      const id = row[`details.adventurer.bag_item_${i}`];
      const xp = row[`details.adventurer.bag_item_${i}_xp`];
      if (!id) continue;
      const level = Math.floor(Math.sqrt(xp || 0));
      items.push({
        id,
        xp: xp || 0,
        level,
        name: this.getItemName(id),
        tier: this.getItemTier(id),
        type: this.getItemType(id),
        slot: this.getItemSlot(id),
        prefix: this.getItemPrefix(id, seed),
        suffix: this.getItemSuffix(id, seed),
        bagSlot: i,
      });
    }
    return items;
  }

  private parseMarket(row: any): MarketItem[] {
    try {
      const items: number[] = JSON.parse(row['details.city.market.items_list'] || '[]');
      const charisma = row['details.adventurer.stats.charisma'] || 0;
      return items.map((id: number) => ({
        id,
        name: this.getItemName(id),
        tier: this.getItemTier(id),
        type: this.getItemType(id),
        slot: this.getItemSlot(id),
        price: this.calculatePrice(id, charisma)
      }));
    } catch {
      return [];
    }
  }

  private calculateCombatPreview(adventurer: Adventurer, beast: Beast): CombatPreview {
    const str = adventurer.stats.strength;
    const ringId = adventurer.equipment.ring?.id || 0;
    const ringXp = adventurer.equipment.ring?.xp || 0;
    const ringName = adventurer.equipment.ring?.name;
    const base = Math.max(1, Math.floor(str / 2));
    const playerDamageBase = base;
    const playerDamageCritical = base * 2; // simplified
    const beastDamageMax = this.calculateBeastDamage(beast, adventurer);
    const flee = Math.min(100, Math.floor((adventurer.stats.dexterity / Math.max(1, adventurer.level)) * 100));
    const ambush = Math.min(100, Math.floor((adventurer.stats.wisdom / Math.max(1, adventurer.level)) * 100));
    return {
      playerDamage: { base: playerDamageBase, critical: playerDamageCritical },
      beastDamage: { max: beastDamageMax },
      fleeChance: flee,
      ambushChance: ambush,
      outcome: beast.health > 0 ? 'Fight ongoing' : 'No enemy',
    };
  }

  private getItemName(id: number): string {
    const baseNames: Record<number, string> = {
      1: 'Amulet', 2: 'Pendant', 3: 'Necklace', 4: 'Gold Ring', 5: 'Silver Ring', 6: 'Bronze Ring', 7: 'Titanium Ring', 8: 'Platinum Ring'
    };
    return baseNames[id] || `Item ${id}`;
  }
  private getItemTier(id: number): number {
    if (id <= 3) return 1; if (id <= 8) return 2; if (id <= 16) return 3; if (id <= 46) return 4; if (id <= 101) return 5; return 5;
  }
  private getItemType(id: number): string {
    if (id <= 3) return 'Necklace'; if (id <= 8) return 'Ring'; if (id <= 16 || (id >= 42 && id <= 46) || (id >= 72 && id <= 76)) return 'Weapon'; if (id <= 41) return 'Cloth'; if (id <= 71) return 'Hide'; if (id <= 101) return 'Metal'; return 'None';
  }
  private getItemSlot(id: number): string {
    if (id <= 3) return 'Neck'; if (id <= 8) return 'Ring'; if (id <= 16 || (id >= 42 && id <= 46) || (id >= 72 && id <= 76)) return 'Weapon'; if (id <= 21) return 'Chest'; if (id <= 26) return 'Head'; if (id <= 31) return 'Waist'; if (id <= 36) return 'Foot'; if (id <= 41) return 'Hand'; if (id <= 51) return 'Chest'; if (id <= 56) return 'Head'; if (id <= 61) return 'Waist'; if (id <= 66) return 'Foot'; if (id <= 71) return 'Hand'; if (id <= 81) return 'Chest'; if (id <= 86) return 'Head'; if (id <= 91) return 'Waist'; if (id <= 96) return 'Foot'; if (id <= 101) return 'Hand'; return 'None';
  }
  private getItemPrefix(id: number, seed: number): string | undefined { const index = ((seed + id) % 69) + 1; return ITEM_NAME_PREFIXES[index]; }
  private getItemSuffix(id: number, seed: number): string | undefined { const index = ((seed + id) % 18) + 1; return ITEM_NAME_SUFFIXES[index]; }
  private getBeastTier(id: number): number { if (id <= 5 || (id >= 26 && id <= 30) || (id >= 51 && id <= 55)) return 1; if ((id >= 6 && id <= 10) || (id >= 31 && id <= 35) || (id >= 56 && id <= 60)) return 2; if ((id >= 11 && id <= 15) || (id >= 36 && id <= 40) || (id >= 61 && id <= 65)) return 3; if ((id >= 16 && id <= 20) || (id >= 41 && id <= 45) || (id >= 66 && id <= 70)) return 4; return 5; }
  private getBeastType(id: number): string { if (id >= 1 && id <= 25) return 'Magic'; if (id <= 50) return 'Blade'; if (id <= 75) return 'Bludgeon'; return 'None'; }
  private getBeastArmorType(id: number): string { if (id >= 1 && id <= 25) return 'Cloth'; if (id <= 50) return 'Hide'; if (id <= 75) return 'Metal'; return 'None'; }

  private calculateBeastDamage(beast: Beast, adventurer: Adventurer): number {
    const slots: (keyof Adventurer['equipment'])[] = ['head','chest','waist','hand','foot'];
    const atkType = beast.type;
    let total = 0; let count = 0;
    for (const s of slots) {
      const armor = adventurer.equipment[s];
      if (armor) {
        const armorType = this.getArmorType(armor.id);
        let dmg = beast.level * (6 - beast.tier);
        dmg = elementalAdjustedDamage(dmg, atkType, armorType);
        const armorVal = armor.level * (6 - armor.tier);
        dmg = Math.max(2, dmg - armorVal);
        total += dmg; count++;
      }
    }
    return Math.max(2, Math.floor(total / 5));
  }
  private getArmorType(id: number): string { if (id <= 41) return 'Cloth'; if (id <= 71) return 'Hide'; return 'Metal'; }

  private async sql<T>(query: string): Promise<T> {
    const url = `${this.config.toriiUrl}/sql?query=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);
    return response.json() as any;
  }
}

// Types
export type GamePhase = 'exploration' | 'combat' | 'level_up' | 'death';
export interface GameState { gameId: number; actionCount: number; phase: GamePhase; adventurer: Adventurer; beast: Beast | null; bag: Item[]; market: MarketItem[]; combatPreview?: CombatPreview; }
export interface Adventurer { id: number; health: number; xp: number; level: number; gold: number; beastHealth: number; statUpgradesAvailable: number; stats: { strength: number; dexterity: number; vitality: number; intelligence: number; wisdom: number; charisma: number; luck: number; }; equipment: { weapon: Item | null; chest: Item | null; head: Item | null; waist: Item | null; foot: Item | null; hand: Item | null; neck: Item | null; ring: Item | null; }; }
export interface Item { id: number; xp: number; level: number; name: string; tier: number; type: string; slot: string; prefix?: string; suffix?: string; bagSlot?: number; }
export interface Beast { id: number; health: number; level: number; seed: string; name: string; tier: number; type: string; armorType: string; prefix?: string; suffix?: string; }
export interface MarketItem { id: number; name: string; tier: number; type: string; slot: string; price: number; }
export interface CombatPreview { playerDamage: { base: number; critical: number; }; beastDamage: { max: number; }; fleeChance: number; ambushChance: number; outcome: string; }

