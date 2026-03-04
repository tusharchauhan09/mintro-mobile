-- ============================================================================
-- Replace ALL seed data: single user (8G714...) owns all 6 cards.
-- Only 6 card templates from cards.txt with Cloudinary URLs.
-- NFT fields (mint_address, metadata_uri, tx_signature) left NULL for Phase 2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clean up all existing data (FK order: listings → cards → card_templates → users)
-- ---------------------------------------------------------------------------
DELETE FROM battle_moves;
DELETE FROM battles;
DELETE FROM listings;
DELETE FROM cards;
DELETE FROM card_templates;
DELETE FROM nonces;
DELETE FROM users;

-- ---------------------------------------------------------------------------
-- 2. Insert the single test user
-- ---------------------------------------------------------------------------
INSERT INTO users (wallet_address, username, xp, level, energy, win_streak, total_wins, total_losses)
VALUES (
  '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng',
  'TestPlayer',
  500,
  5,
  10,
  3,
  12,
  4
);

-- ---------------------------------------------------------------------------
-- 3. Insert the 6 card templates from cards.txt
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
-- 4. Give the test user ALL 6 cards (one of each template)
-- ---------------------------------------------------------------------------
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Little Wyrm'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 2, 80, ct.base_attack + 1, ct.base_defense, ct.base_hp + 3
FROM card_templates ct, users u
WHERE ct.name = 'The Rogue'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 3, 200, ct.base_attack + 2, ct.base_defense + 1, ct.base_hp + 5
FROM card_templates ct, users u
WHERE ct.name = 'Valor Knight'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 3, 180, ct.base_attack + 2, ct.base_defense + 1, ct.base_hp + 4
FROM card_templates ct, users u
WHERE ct.name = 'The Ice Mage'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 5, 800, ct.base_attack + 4, ct.base_defense + 3, ct.base_hp + 10
FROM card_templates ct, users u
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id, 1, 5, 750, ct.base_attack + 4, ct.base_defense + 2, ct.base_hp + 8
FROM card_templates ct, users u
WHERE ct.name = 'The Paladin'
  AND u.wallet_address = '8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng';
