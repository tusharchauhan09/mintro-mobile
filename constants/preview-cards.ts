import type { CardWithTemplate } from '@/types/database';

/**
 * Mock card data for previewing the inventory screen.
 * 6 card templates matching cards.txt — assigned to preview wallet.
 */

const PREVIEW_WALLET = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';
const PREVIEW_USER_ID = 'preview-user-001';

function makeCard(
  id: string,
  serial: number,
  level: number,
  xp: number,
  attack: number,
  defense: number,
  hp: number,
  template: CardWithTemplate['card_templates'],
): CardWithTemplate {
  return {
    id,
    mint_address: null,
    template_id: template.id,
    owner_id: PREVIEW_USER_ID,
    serial_number: serial,
    metadata_uri: null,
    level,
    xp,
    attack,
    defense,
    hp,
    tx_signature: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    card_templates: template,
  };
}

// -- Templates (6 cards from cards.txt) --

const templates: CardWithTemplate['card_templates'][] = [
  // COMMON
  {
    id: 'tpl-fire-common',
    name: 'Little Wyrm',
    description: 'A scrappy young dragon armed with sword and shield. Small but fierce, this wyrm fights with surprising tenacity.',
    rarity: 'COMMON',
    element: 'FIRE',
    base_attack: 5,
    base_defense: 3,
    base_hp: 20,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546566/little_wyrm_uqxcpq.png',
    spawn_weight: 60,
    created_at: '2026-02-28T00:00:00Z',
  },
  // RARE
  {
    id: 'tpl-shadow-rare',
    name: 'The Rogue',
    description: 'A cunning shadow operative who strikes from the darkness. Swift and deadly with dual blades.',
    rarity: 'RARE',
    element: 'SHADOW',
    base_attack: 9,
    base_defense: 6,
    base_hp: 25,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546570/the_rougue_zk6koy.png',
    spawn_weight: 25,
    created_at: '2026-02-28T00:00:00Z',
  },
  // EPIC
  {
    id: 'tpl-earth-epic',
    name: 'Valor Knight',
    description: 'A stalwart guardian clad in ancient armor. Unwavering defense and honor-bound to protect allies at any cost.',
    rarity: 'EPIC',
    element: 'EARTH',
    base_attack: 12,
    base_defense: 10,
    base_hp: 35,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546567/valor_knight_fcxded.png',
    spawn_weight: 12,
    created_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'tpl-water-epic',
    name: 'The Ice Mage',
    description: 'A mystical sorcerer who commands the frozen elements. Devastating magical attacks freeze enemies solid.',
    rarity: 'EPIC',
    element: 'WATER',
    base_attack: 10,
    base_defense: 4,
    base_hp: 30,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546568/the_ice_mage_dzk8w0.png',
    spawn_weight: 12,
    created_at: '2026-02-28T00:00:00Z',
  },
  // LEGENDARY
  {
    id: 'tpl-water-legendary',
    name: "Neptune's Wrath",
    description: 'A heavily armored deep-sea operative wielding devastating plasma weaponry. Few survive an encounter.',
    rarity: 'LEGENDARY',
    element: 'WATER',
    base_attack: 15,
    base_defense: 8,
    base_hp: 45,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546567/neptunes_wrath_o2vwpa.png',
    spawn_weight: 3,
    created_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'tpl-earth-legendary',
    name: 'The Paladin',
    description: 'A holy warrior blessed with divine power. Immense defense and righteous fury make this champion nearly unstoppable.',
    rarity: 'LEGENDARY',
    element: 'EARTH',
    base_attack: 13,
    base_defense: 12,
    base_hp: 42,
    image_url: 'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546568/the_paladin_j4absm.png',
    spawn_weight: 3,
    created_at: '2026-02-28T00:00:00Z',
  },
];

// -- Build cards with varied levels --

export const PREVIEW_CARDS: CardWithTemplate[] = templates.map((tpl, i) => {
  const levelMap: Record<string, number> = {
    COMMON: 1 + (i % 3),
    RARE: 2 + (i % 2),
    EPIC: 3 + (i % 3),
    LEGENDARY: 5,
  };
  const level = levelMap[tpl.rarity] ?? 1;
  const bonus = level - 1;

  return makeCard(
    `preview-card-${String(i + 1).padStart(3, '0')}`,
    i + 1,
    level,
    level * 100,
    tpl.base_attack + bonus,
    tpl.base_defense + Math.floor(bonus / 2),
    tpl.base_hp + bonus * 3,
    tpl,
  );
});

export const PREVIEW_WALLET_ADDRESS = PREVIEW_WALLET;
