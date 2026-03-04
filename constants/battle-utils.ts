// ---------------------------------------------------------------------------
// Client-side battle utilities — element wheel, abilities, log formatting
// ---------------------------------------------------------------------------

import type { Element, BattleMove, CardWithTemplate } from '@/types/database';

export const ELEMENT_ADVANTAGE: Record<string, string[]> = {
  FIRE: ['EARTH'],
  EARTH: ['LIGHTNING'],
  LIGHTNING: ['WATER'],
  WATER: ['FIRE'],
  AIR: ['SHADOW'],
  SHADOW: ['AIR'],
};

export function getElementAdvantage(
  attacker: Element,
  defender: Element,
): 'advantage' | 'disadvantage' | 'neutral' {
  if (ELEMENT_ADVANTAGE[attacker]?.includes(defender)) return 'advantage';
  if (ELEMENT_ADVANTAGE[defender]?.includes(attacker)) return 'disadvantage';
  return 'neutral';
}

export function getElementMultiplier(attacker: Element, defender: Element): number {
  if (ELEMENT_ADVANTAGE[attacker]?.includes(defender)) return 1.5;
  if (ELEMENT_ADVANTAGE[defender]?.includes(attacker)) return 0.75;
  return 1.0;
}

export interface SpecialAbility {
  name: string;
  description: string;
  cooldown: number;
}

export const SPECIAL_ABILITIES: Record<Element, SpecialAbility> = {
  FIRE: { name: 'Blaze', description: '+50% attack this turn', cooldown: 3 },
  WATER: { name: 'Tidal Shield', description: '+100% defense this turn', cooldown: 3 },
  EARTH: { name: 'Fortify', description: 'Heal 20% max HP', cooldown: 4 },
  AIR: { name: 'Gust', description: 'Force opponent to switch cards', cooldown: 4 },
  LIGHTNING: { name: 'Surge', description: 'Attack twice at half damage', cooldown: 3 },
  SHADOW: { name: 'Veil', description: 'Dodge the next attack', cooldown: 3 },
};

export function formatMoveLog(
  move: BattleMove,
  cards: Record<string, CardWithTemplate>,
  isMyMove: boolean,
): string {
  const prefix = isMyMove ? 'Your' : "Opponent's";
  const cardName = move.card_used ? cards[move.card_used]?.card_templates?.name ?? 'Card' : 'Player';

  switch (move.move_type) {
    case 'ATTACK':
      return `${prefix} ${cardName} attacks for ${move.damage_dealt ?? 0} damage!`;
    case 'SPECIAL': {
      const element = move.card_used
        ? cards[move.card_used]?.card_templates?.element
        : null;
      const abilityName = element ? SPECIAL_ABILITIES[element]?.name : 'Special';
      return `${prefix} ${cardName} uses ${abilityName}!${move.damage_dealt ? ` ${move.damage_dealt} damage!` : ''}`;
    }
    case 'SWITCH':
      return `${prefix} ${cardName} enters the battle!`;
    case 'FORFEIT':
      return isMyMove ? 'You forfeited the match.' : 'Opponent forfeited the match!';
    default:
      return '';
  }
}

export function getElementColor(element: Element): string {
  switch (element) {
    case 'FIRE': return '#FF6B35';
    case 'WATER': return '#4FC3F7';
    case 'EARTH': return '#8BC34A';
    case 'AIR': return '#B0BEC5';
    case 'LIGHTNING': return '#FFD54F';
    case 'SHADOW': return '#CE93D8';
  }
}
