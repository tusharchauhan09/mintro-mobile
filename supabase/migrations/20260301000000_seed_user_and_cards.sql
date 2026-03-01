-- ============================================================================
-- Seed: Create user for devnet wallet and give them starter cards
-- Wallet: 7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn (Devnet)
-- ============================================================================

-- 1. Upsert the user (idempotent — safe to re-run)
INSERT INTO users (wallet_address, username, energy, level, xp, win_streak, total_wins, total_losses)
VALUES (
  '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn',
  'CyberPlayer',
  100,
  1,
  0,
  0,
  0,
  0
)
ON CONFLICT (wallet_address) DO UPDATE
  SET updated_at = now();

-- 2. Seed one card per template for this user
-- Little Wyrm (COMMON / FIRE)
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT
  ct.id,
  u.id,
  COALESCE(
    (SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0
  ) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Little Wyrm'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn'
  AND NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

-- Neptune's Wrath (LEGENDARY / WATER)
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT
  ct.id,
  u.id,
  COALESCE(
    (SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0
  ) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Neptune''s Wrath'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn'
  AND NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.owner_id = u.id AND c.template_id = ct.id
  );

-- Valor Knight (EPIC / EARTH)
INSERT INTO cards (template_id, owner_id, serial_number, level, xp, attack, defense, hp)
SELECT
  ct.id,
  u.id,
  COALESCE(
    (SELECT MAX(serial_number) FROM cards WHERE template_id = ct.id), 0
  ) + 1,
  1, 0, ct.base_attack, ct.base_defense, ct.base_hp
FROM card_templates ct, users u
WHERE ct.name = 'Valor Knight'
  AND u.wallet_address = '7X9Q5wYQ8ayqzoCQ7Hf6aSF88oPRa89DSJXr1YYwQEgn'
  AND NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.owner_id = u.id AND c.template_id = ct.id
  );
