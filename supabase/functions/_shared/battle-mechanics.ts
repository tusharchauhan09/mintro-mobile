// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared battle mechanics — element wheel, damage formula, special abilities
// Used by battle-queue and battle-move edge functions
// ---------------------------------------------------------------------------

export const ELEMENT_ADVANTAGE: Record<string, string[]> = {
  FIRE: ['EARTH'],
  EARTH: ['LIGHTNING'],
  LIGHTNING: ['WATER'],
  WATER: ['FIRE'],
  AIR: ['SHADOW'],
  SHADOW: ['AIR'],
};

export function getElementMultiplier(attacker: string, defender: string): number {
  if (ELEMENT_ADVANTAGE[attacker]?.includes(defender)) return 1.5;
  if (ELEMENT_ADVANTAGE[defender]?.includes(attacker)) return 0.75;
  return 1.0;
}

export function calculateDamage(
  attackStat: number,
  defenseStat: number,
  attackerElement: string,
  defenderElement: string,
  multiplier: number = 1.0,
): number {
  const elemMult = getElementMultiplier(attackerElement, defenderElement);
  return Math.max(1, Math.floor(attackStat * elemMult * multiplier - defenseStat * 0.5));
}

export interface SpecialAbilityDef {
  name: string;
  cooldown: number;
}

export const SPECIAL_ABILITIES: Record<string, SpecialAbilityDef> = {
  FIRE:      { name: 'Blaze',        cooldown: 3 },
  WATER:     { name: 'Tidal Shield', cooldown: 3 },
  EARTH:     { name: 'Fortify',      cooldown: 4 },
  AIR:       { name: 'Gust',         cooldown: 4 },
  LIGHTNING: { name: 'Surge',        cooldown: 3 },
  SHADOW:    { name: 'Veil',         cooldown: 3 },
};

export const TURN_TIMEOUT_MS = 30_000;

export const XP_WIN_BASE = 50;
export const XP_PER_KO = 10;
export const XP_LOSS = 15;

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
