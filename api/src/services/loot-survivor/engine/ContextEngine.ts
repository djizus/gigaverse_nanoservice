import type { GameState } from './GameStateService';

export class ContextEngine {
  generateContext(state: GameState): { content: string; tokens: number } {
    let xml = '';
    switch (state.phase) {
      case 'death':
        xml = this.buildDeathContext(state); break;
      case 'combat':
        xml = this.buildCombatContext(state); break;
      case 'level_up':
        xml = this.buildLevelUpContext(state); break;
      default:
        xml = this.buildExplorationContext(state);
    }
    return { content: xml, tokens: Math.ceil(xml.length / 4) };
  }

  private buildDeathContext(state: GameState): string {
    const { adventurer } = state;
    return `<context>\n  <phase>death</phase>\n  <level>${adventurer.level}</level>\n  <xp>${adventurer.xp}</xp>\n  <gold>${adventurer.gold}</gold>\n</context>`;
  }

  private buildCombatContext(state: GameState): string {
    const { adventurer, beast, combatPreview } = state;
    const formatEquip = (item: any) => item ? `${item.name}:L${item.level}:T${item.tier}` : 'None';
    return `<context>\n  <phase>combat</phase>\n  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>\n  <stats str="${adventurer.stats.strength}" dex="${adventurer.stats.dexterity}" vit="${adventurer.stats.vitality}" int="${adventurer.stats.intelligence}" wis="${adventurer.stats.wisdom}" cha="${adventurer.stats.charisma}"/>\n  <equipment weapon="${formatEquip(adventurer.equipment.weapon)}" chest="${formatEquip(adventurer.equipment.chest)}" head="${formatEquip(adventurer.equipment.head)}" waist="${formatEquip(adventurer.equipment.waist)}" foot="${formatEquip(adventurer.equipment.foot)}" hand="${formatEquip(adventurer.equipment.hand)}" neck="${formatEquip(adventurer.equipment.neck)}" ring="${formatEquip(adventurer.equipment.ring)}"/>\n  <beast name="${beast?.name || 'Unknown'}" health="${beast?.health || 0}" level="${beast?.level || 1}" tier="${beast?.tier || 0}"/>\n  <damage player="${combatPreview?.playerDamage.base || 0}" critical="${combatPreview?.playerDamage.critical || 0}" beast="${combatPreview?.beastDamage.max || 0}"/>\n  <flee chance="${combatPreview?.fleeChance || 0}"/>\n  <estimate>${combatPreview?.outcome || 'Unknown'}</estimate>\n</context>`;
  }

  private buildLevelUpContext(state: GameState): string {
    const { adventurer } = state;
    return `<context>\n  <phase>level_up</phase>\n  <level>${adventurer.level}</level>\n  <points>${adventurer.statUpgradesAvailable}</points>\n</context>`;
  }

  private buildExplorationContext(state: GameState): string {
    const { adventurer, market, bag } = state;
    const formatEquip = (item: any) => item ? `${item.name}:L${item.level}:T${item.tier}` : 'None';
    const affordableItems = market.filter(i => i.price <= adventurer.gold).map(i => `  <item>${i.name}:T${i.tier}:${i.price}g</item>`).join('\n');
    const bagItems = bag.length ? bag.map(i => `  <item>${i.name}:L${i.level}:T${i.tier}</item>`).join('\n') : '    <!-- No bag items -->';
    return `<context>\n  <phase>exploration</phase>\n  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>\n  <stats str="${adventurer.stats.strength}" dex="${adventurer.stats.dexterity}" vit="${adventurer.stats.vitality}" int="${adventurer.stats.intelligence}" wis="${adventurer.stats.wisdom}" cha="${adventurer.stats.charisma}"/>\n  <equipment weapon="${formatEquip(adventurer.equipment.weapon)}" chest="${formatEquip(adventurer.equipment.chest)}" head="${formatEquip(adventurer.equipment.head)}" waist="${formatEquip(adventurer.equipment.waist)}" foot="${formatEquip(adventurer.equipment.foot)}" hand="${formatEquip(adventurer.equipment.hand)}" neck="${formatEquip(adventurer.equipment.neck)}" ring="${formatEquip(adventurer.equipment.ring)}"/>\n  <market>\n${affordableItems || '    <!-- No affordable items -->'}\n  </market>\n  <bag>\n${bagItems}\n  </bag>\n</context>`;
  }
}

