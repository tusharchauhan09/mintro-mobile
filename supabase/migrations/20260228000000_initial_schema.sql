-- ============================================================================
-- CyberCard Arena — Initial Database Schema
-- Supabase (PostgreSQL 15+) · Devnet Phase
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM types
-- ---------------------------------------------------------------------------
CREATE TYPE rarity       AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
CREATE TYPE element      AS ENUM ('FIRE', 'WATER', 'EARTH', 'AIR', 'LIGHTNING', 'SHADOW');
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');
CREATE TYPE battle_status  AS ENUM ('OPEN', 'ACTIVE', 'COMPLETED');
CREATE TYPE move_type      AS ENUM ('ATTACK', 'SWITCH', 'FORFEIT');

-- ---------------------------------------------------------------------------
-- 2. users — wallet-based identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  username       text,
  avatar_url     text,
  xp             integer NOT NULL DEFAULT 0,
  level          integer NOT NULL DEFAULT 1,
  energy         integer NOT NULL DEFAULT 100,
  win_streak     integer NOT NULL DEFAULT 0,
  total_wins     integer NOT NULL DEFAULT 0,
  total_losses   integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_energy_range CHECK (energy >= 0 AND energy <= 100),
  CONSTRAINT users_level_positive CHECK (level >= 1),
  CONSTRAINT users_xp_non_negative CHECK (xp >= 0)
);

CREATE INDEX idx_users_wallet ON users (wallet_address);

-- ---------------------------------------------------------------------------
-- 3. nonces — auth challenge tokens (short-lived)
-- ---------------------------------------------------------------------------
CREATE TABLE nonces (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  nonce          text UNIQUE NOT NULL,
  expires_at     timestamptz NOT NULL,
  used           boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nonces_wallet   ON nonces (wallet_address);
CREATE INDEX idx_nonces_expires  ON nonces (expires_at) WHERE NOT used;

-- ---------------------------------------------------------------------------
-- 4. card_templates — game-defined archetypes
-- ---------------------------------------------------------------------------
CREATE TABLE card_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  rarity        rarity NOT NULL,
  element       element NOT NULL,
  base_attack   integer NOT NULL,
  base_defense  integer NOT NULL,
  base_hp       integer NOT NULL,
  image_url     text,
  spawn_weight  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ct_attack_positive  CHECK (base_attack > 0),
  CONSTRAINT ct_defense_positive CHECK (base_defense > 0),
  CONSTRAINT ct_hp_positive      CHECK (base_hp > 0),
  CONSTRAINT ct_weight_range     CHECK (spawn_weight >= 0 AND spawn_weight <= 100)
);

-- ---------------------------------------------------------------------------
-- 5. cards — individual owned cards (local for now, NFT mint later)
-- ---------------------------------------------------------------------------
CREATE TABLE cards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address   text UNIQUE,                        -- NULL until NFT phase
  template_id    uuid NOT NULL REFERENCES card_templates (id) ON DELETE RESTRICT,
  owner_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  serial_number  integer NOT NULL,
  metadata_uri   text,                               -- NULL until NFT phase
  level          integer NOT NULL DEFAULT 1,
  xp             integer NOT NULL DEFAULT 0,
  attack         integer NOT NULL,
  defense        integer NOT NULL,
  hp             integer NOT NULL,
  tx_signature   text,                               -- NULL until NFT phase
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cards_level_positive CHECK (level >= 1),
  CONSTRAINT cards_xp_non_negative CHECK (xp >= 0),
  CONSTRAINT cards_unique_serial UNIQUE (template_id, serial_number)
);

CREATE INDEX idx_cards_owner    ON cards (owner_id);
CREATE INDEX idx_cards_template ON cards (template_id);

-- ---------------------------------------------------------------------------
-- 6. listings — marketplace
-- ---------------------------------------------------------------------------
CREATE TABLE listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  seller_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  buyer_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  price_sol     numeric(12, 9) NOT NULL,             -- SOL with lamport precision
  status        listing_status NOT NULL DEFAULT 'ACTIVE',
  tx_signature  text,
  listed_at     timestamptz NOT NULL DEFAULT now(),
  sold_at       timestamptz,

  CONSTRAINT listings_price_positive CHECK (price_sol > 0)
);

CREATE INDEX idx_listings_status ON listings (status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_seller ON listings (seller_id);
CREATE INDEX idx_listings_card   ON listings (card_id);

-- ---------------------------------------------------------------------------
-- 7. battles — PvP matches
-- ---------------------------------------------------------------------------
CREATE TABLE battles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  opponent_id            uuid REFERENCES users (id) ON DELETE CASCADE,
  challenger_deck        uuid[] NOT NULL,             -- array of 3 card IDs
  opponent_deck          uuid[],
  challenger_hp          jsonb NOT NULL,               -- { "cardId": hp, ... }
  opponent_hp            jsonb,
  active_challenger_card integer NOT NULL DEFAULT 0,   -- index 0-2
  active_opponent_card   integer,
  winner_id              uuid REFERENCES users (id) ON DELETE SET NULL,
  status                 battle_status NOT NULL DEFAULT 'OPEN',
  xp_reward              integer NOT NULL DEFAULT 50,
  created_at             timestamptz NOT NULL DEFAULT now(),
  completed_at           timestamptz,

  CONSTRAINT battles_deck_size CHECK (array_length(challenger_deck, 1) = 3),
  CONSTRAINT battles_opponent_deck_size CHECK (
    opponent_deck IS NULL OR array_length(opponent_deck, 1) = 3
  ),
  CONSTRAINT battles_active_card_range CHECK (
    active_challenger_card >= 0 AND active_challenger_card <= 2
  )
);

CREATE INDEX idx_battles_status      ON battles (status) WHERE status IN ('OPEN', 'ACTIVE');
CREATE INDEX idx_battles_challenger  ON battles (challenger_id);
CREATE INDEX idx_battles_opponent    ON battles (opponent_id);

-- ---------------------------------------------------------------------------
-- 8. battle_moves — turn-by-turn log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE battle_moves (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id    uuid NOT NULL REFERENCES battles (id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  turn_number  integer NOT NULL,
  move_type    move_type NOT NULL,
  card_used    uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  target_card  uuid REFERENCES cards (id) ON DELETE SET NULL,
  damage_dealt integer,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bm_turn_positive CHECK (turn_number > 0),
  CONSTRAINT bm_unique_turn UNIQUE (battle_id, turn_number, player_id)
);

CREATE INDEX idx_bm_battle ON battle_moves (battle_id);

-- ---------------------------------------------------------------------------
-- 9. updated_at trigger — auto-updates timestamp on row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Row Level Security (RLS)
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_moves  ENABLE ROW LEVEL SECURITY;

-- card_templates: public read (anyone can browse the card catalog)
CREATE POLICY "card_templates_select"
  ON card_templates FOR SELECT
  USING (true);

-- users: public read, self update
CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- nonces: NO client access — edge functions use service_role key
-- (no policies = denied by default with RLS on)

-- cards: public read, owner can update own cards
CREATE POLICY "cards_select"
  ON cards FOR SELECT
  USING (true);

CREATE POLICY "cards_update_own"
  ON cards FOR UPDATE
  USING (owner_id = auth.uid());

-- listings: public read active listings, seller can insert/update own
CREATE POLICY "listings_select"
  ON listings FOR SELECT
  USING (true);

CREATE POLICY "listings_insert_own"
  ON listings FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "listings_update_own"
  ON listings FOR UPDATE
  USING (seller_id = auth.uid() OR buyer_id = auth.uid());

-- battles: participants can read, authenticated users can create
CREATE POLICY "battles_select_participant"
  ON battles FOR SELECT
  USING (
    status = 'OPEN'
    OR challenger_id = auth.uid()
    OR opponent_id = auth.uid()
  );

CREATE POLICY "battles_insert_auth"
  ON battles FOR INSERT
  WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "battles_update_participant"
  ON battles FOR UPDATE
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

-- battle_moves: participants read, own moves insert
CREATE POLICY "battle_moves_select"
  ON battle_moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles b
      WHERE b.id = battle_moves.battle_id
      AND (b.challenger_id = auth.uid() OR b.opponent_id = auth.uid())
    )
  );

CREATE POLICY "battle_moves_insert_own"
  ON battle_moves FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 11. Cleanup: auto-delete expired nonces (pg_cron or manual)
-- ---------------------------------------------------------------------------
-- Run periodically: DELETE FROM nonces WHERE expires_at < now();
-- Supabase pg_cron can be configured in the dashboard for this.
