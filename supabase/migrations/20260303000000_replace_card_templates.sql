-- ============================================================================
-- Replace card templates with 6 cards from cards.txt
-- Uses Cloudinary image URLs. Keeps NFT fields (mint_address, metadata_uri,
-- tx_signature) untouched on the cards table — those are for Phase 2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clean up existing data that depends on old templates
--    (listings → cards → card_templates due to FK constraints)
-- ---------------------------------------------------------------------------
DELETE FROM listings;
DELETE FROM cards;
DELETE FROM card_templates;

-- ---------------------------------------------------------------------------
-- 2. Insert the 6 card templates from cards.txt
--    Rarity mapping: 1 = COMMON, 2 = RARE, 3 = EPIC, 4 = LEGENDARY
-- ---------------------------------------------------------------------------
INSERT INTO card_templates (name, description, rarity, element, base_attack, base_defense, base_hp, image_url, spawn_weight)
VALUES
  (
    'Little Wyrm',
    'A scrappy young dragon armed with sword and shield. Small but fierce, this wyrm fights with surprising tenacity.',
    'COMMON',
    'FIRE',
    5,
    3,
    20,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546566/little_wyrm_uqxcpq.png',
    60
  ),
  (
    'The Rogue',
    'A cunning shadow operative who strikes from the darkness. Swift and deadly with dual blades.',
    'RARE',
    'SHADOW',
    9,
    6,
    25,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546570/the_rougue_zk6koy.png',
    25
  ),
  (
    'Valor Knight',
    'A stalwart guardian clad in ancient armor. Unwavering defense and honor-bound to protect allies at any cost.',
    'EPIC',
    'EARTH',
    12,
    10,
    35,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546567/valor_knight_fcxded.png',
    12
  ),
  (
    'The Ice Mage',
    'A mystical sorcerer who commands the frozen elements. Devastating magical attacks freeze enemies solid.',
    'EPIC',
    'WATER',
    10,
    4,
    30,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546568/the_ice_mage_dzk8w0.png',
    12
  ),
  (
    'Neptune''s Wrath',
    'A heavily armored deep-sea operative wielding devastating plasma weaponry. Few survive an encounter.',
    'LEGENDARY',
    'WATER',
    15,
    8,
    45,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546567/neptunes_wrath_o2vwpa.png',
    3
  ),
  (
    'The Paladin',
    'A holy warrior blessed with divine power. Immense defense and righteous fury make this champion nearly unstoppable.',
    'LEGENDARY',
    'EARTH',
    13,
    12,
    42,
    'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546568/the_paladin_j4absm.png',
    3
  );

-- ---------------------------------------------------------------------------
-- 3. Re-seed user cards with the new templates
-- ---------------------------------------------------------------------------

-- CyberPlayer gets: Little Wyrm, The Rogue, Neptune's Wrath
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Little Wyrm'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'The Rogue'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 2, 100, ct.base_attack + 1, ct.base_defense + 1, ct.base_hp + 3
FROM card_templates ct, users u
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn';

-- ShadowTrader gets: The Paladin, The Ice Mage
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 3, 200, ct.base_attack + 2, ct.base_defense + 1, ct.base_hp + 5
FROM card_templates ct, users u
WHERE ct.name = 'The Paladin'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 2, 80, ct.base_attack + 1, ct.base_defense, ct.base_hp + 2
FROM card_templates ct, users u
WHERE ct.name = 'The Ice Mage'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd';

-- CardMaster99 gets: Neptune's Wrath, Valor Knight, The Paladin, The Rogue
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 2, 5, 800, ct.base_attack + 4, ct.base_defense + 3, ct.base_hp + 10
FROM card_templates ct, users u
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 4, 500, ct.base_attack + 3, ct.base_defense + 1, ct.base_hp + 6
FROM card_templates ct, users u
WHERE ct.name = 'Valor Knight'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 2, 3, 300, ct.base_attack + 2, ct.base_defense + 2, ct.base_hp + 5
FROM card_templates ct, users u
WHERE ct.name = 'The Paladin'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 2, 2, 100, ct.base_attack + 1, ct.base_defense, ct.base_hp + 2
FROM card_templates ct, users u
WHERE ct.name = 'The Rogue'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj';

-- NovaCollector gets: Little Wyrm, The Ice Mage
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 2, 2, 60, ct.base_attack + 1, ct.base_defense, ct.base_hp + 2
FROM card_templates ct, users u
WHERE ct.name = 'Little Wyrm'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 2, 1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'The Ice Mage'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';

-- ---------------------------------------------------------------------------
-- 4. Re-create marketplace listings
-- ---------------------------------------------------------------------------

-- ShadowTrader lists The Paladin for 2.0 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 2.000000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'The Paladin'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd';

-- CardMaster99 lists Neptune's Wrath for 2.5 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 2.500000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj';
