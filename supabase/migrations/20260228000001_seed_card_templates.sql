-- ============================================================================
-- Seed: Initial card templates matching assets/cards/ images
-- These are local image references for now — will be replaced with IPFS
-- URIs in the NFT phase.
-- ============================================================================

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
    'assets/cards/f1.png',
    60
  ),
  (
    'Neptune''s Wrath',
    'A heavily armored deep-sea operative wielding devastating plasma weaponry. Few survive an encounter.',
    'LEGENDARY',
    'WATER',
    15,
    8,
    45,
    'assets/cards/f2.png',
    3
  ),
  (
    'Valor Knight',
    'A stalwart guardian clad in ancient armor. Unwavering defense and honor-bound to protect allies at any cost.',
    'EPIC',
    'EARTH',
    12,
    10,
    35,
    'assets/cards/f3.png',
    12
  );
