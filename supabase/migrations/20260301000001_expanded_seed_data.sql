-- ============================================================================
-- Expanded Seed Data — More card templates, extra users, cards, and listings
-- Safe to re-run (uses ON CONFLICT / NOT EXISTS guards)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Additional card templates (9 new across all elements and rarities)
-- ---------------------------------------------------------------------------
INSERT INTO card_templates (name, description, rarity, element, base_attack, base_defense, base_hp, image_url, spawn_weight)
VALUES
  -- FIRE
  (
    'Inferno Titan',
    'An ancient colossus forged in the heart of a dying star. Each step melts the ground beneath it.',
    'LEGENDARY',
    'FIRE',
    18,
    6,
    40,
    'assets/cards/f1.png',
    3
  ),
  (
    'Ember Fox',
    'A swift and cunning fire spirit that darts through flames. Its tail leaves trails of sparks.',
    'RARE',
    'FIRE',
    8,
    5,
    25,
    'assets/cards/f1.png',
    25
  ),
  -- WATER
  (
    'Tidal Serpent',
    'A massive sea creature that commands ocean currents. Ships caught in its wake are never seen again.',
    'EPIC',
    'WATER',
    11,
    9,
    38,
    'assets/cards/f2.png',
    12
  ),
  (
    'Frost Sprite',
    'A tiny ice elemental with a mischievous streak. Freezes opponents solid with a single touch.',
    'COMMON',
    'WATER',
    4,
    6,
    22,
    'assets/cards/f2.png',
    60
  ),
  -- EARTH
  (
    'Stone Golem',
    'An ancient construct animated by forgotten magic. Nearly indestructible but painfully slow.',
    'RARE',
    'EARTH',
    6,
    14,
    30,
    'assets/cards/f3.png',
    25
  ),
  (
    'Root Weaver',
    'A forest guardian that entangles foes in living vines. Patient and relentless in defense.',
    'COMMON',
    'EARTH',
    3,
    8,
    24,
    'assets/cards/f3.png',
    60
  ),
  -- AIR
  (
    'Storm Falcon',
    'A raptor born from thunderclouds. Strikes with lightning speed and vanishes before the thunder.',
    'EPIC',
    'AIR',
    13,
    4,
    28,
    'assets/cards/f1.png',
    12
  ),
  (
    'Zephyr Wisp',
    'A gentle breeze given form. Deceptively fragile — its gusts can topple giants.',
    'COMMON',
    'AIR',
    5,
    4,
    18,
    'assets/cards/f2.png',
    60
  ),
  -- LIGHTNING
  (
    'Voltaic Drake',
    'A dragon wreathed in perpetual lightning. Its roar ionizes the air for miles around.',
    'LEGENDARY',
    'LIGHTNING',
    16,
    7,
    42,
    'assets/cards/f3.png',
    3
  ),
  (
    'Spark Hound',
    'A loyal beast that crackles with static electricity. Paralysis is guaranteed on contact.',
    'RARE',
    'LIGHTNING',
    9,
    6,
    26,
    'assets/cards/f1.png',
    25
  ),
  -- SHADOW
  (
    'Void Reaper',
    'A nightmare given form. Harvests the souls of the fallen and grows stronger with each kill.',
    'LEGENDARY',
    'SHADOW',
    17,
    5,
    38,
    'assets/cards/f2.png',
    3
  ),
  (
    'Shade Stalker',
    'An assassin that moves between shadows. You never see it coming — and rarely survive the encounter.',
    'EPIC',
    'SHADOW',
    14,
    3,
    30,
    'assets/cards/f3.png',
    12
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Additional seed users (devnet test wallets)
-- ---------------------------------------------------------------------------
INSERT INTO users (wallet_address, username, energy, level, xp, win_streak, total_wins, total_losses)
VALUES
  (
    'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd',
    'ShadowTrader',
    80,
    3,
    450,
    2,
    12,
    5
  ),
  (
    '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj',
    'CardMaster99',
    100,
    5,
    1200,
    5,
    30,
    8
  ),
  (
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
    'NovaCollector',
    45,
    2,
    180,
    0,
    4,
    6
  )
ON CONFLICT (wallet_address) DO UPDATE
  SET updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Give seed users some cards
-- ---------------------------------------------------------------------------

-- ShadowTrader gets: Void Reaper, Ember Fox, Stone Golem
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  3, 200, ct.base_attack + 2, ct.base_defense + 1, ct.base_hp + 5
FROM card_templates ct, users u
WHERE ct.name = 'Void Reaper'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  2, 80, ct.base_attack + 1, ct.base_defense, ct.base_hp + 2
FROM card_templates ct, users u
WHERE ct.name = 'Ember Fox'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Stone Golem'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

-- CardMaster99 gets: Inferno Titan, Voltaic Drake, Storm Falcon, Tidal Serpent, Neptune's Wrath
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  5, 800, ct.base_attack + 4, ct.base_defense + 3, ct.base_hp + 10
FROM card_templates ct, users u
WHERE ct.name = 'Inferno Titan'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  5, 750, ct.base_attack + 4, ct.base_defense + 2, ct.base_hp + 8
FROM card_templates ct, users u
WHERE ct.name = 'Voltaic Drake'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  4, 500, ct.base_attack + 3, ct.base_defense + 1, ct.base_hp + 6
FROM card_templates ct, users u
WHERE ct.name = 'Storm Falcon'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  3, 300, ct.base_attack + 2, ct.base_defense + 2, ct.base_hp + 5
FROM card_templates ct, users u
WHERE ct.name = 'Tidal Serpent'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  2, 100, ct.base_attack + 1, ct.base_defense + 1, ct.base_hp + 3
FROM card_templates ct, users u
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

-- NovaCollector gets: Little Wyrm, Frost Sprite, Zephyr Wisp
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  2, 60, ct.base_attack + 1, ct.base_defense, ct.base_hp + 2
FROM card_templates ct, users u
WHERE ct.name = 'Little Wyrm'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Frost Sprite'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT ct.id, u.id,
  COALESCE((SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Zephyr Wisp'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'
  AND NOT EXISTS (
    SELECT 1 FROM cards c WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

-- ---------------------------------------------------------------------------
-- 4. Marketplace listings (some cards listed for sale)
-- ---------------------------------------------------------------------------

-- ShadowTrader lists Stone Golem for 0.5 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 0.500000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'Stone Golem'
  AND u.wallet_address = 'BKoR3wC8bJPHgNBgz7d2qNFpmjGjemdCkMsYf7uvSAjd'
  AND NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.card_id = c.id AND l.status = 'ACTIVE'
  );

-- CardMaster99 lists Neptune's Wrath for 2.5 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 2.500000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.card_id = c.id AND l.status = 'ACTIVE'
  );

-- CardMaster99 lists Tidal Serpent for 1.2 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 1.200000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'Tidal Serpent'
  AND u.wallet_address = '5FHwkrdxnthqApyMdVPT1RZYt7Qvn2TAz3SGQJfkAxSj'
  AND NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.card_id = c.id AND l.status = 'ACTIVE'
  );

-- NovaCollector lists Frost Sprite for 0.15 SOL
INSERT INTO listings (card_id, seller_id, price_sol, status)
SELECT c.id, c.owner_id, 0.150000000, 'ACTIVE'
FROM cards c
JOIN card_templates ct ON c.template_id = ct.id
JOIN users u ON c.owner_id = u.id
WHERE ct.name = 'Frost Sprite'
  AND u.wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'
  AND NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.card_id = c.id AND l.status = 'ACTIVE'
  );
