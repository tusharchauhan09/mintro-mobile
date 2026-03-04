-- ============================================================================
-- Battle matchmaking queue + battle state enhancements
-- ============================================================================

-- 1. Add SPECIAL to move_type enum
ALTER TYPE move_type ADD VALUE IF NOT EXISTS 'SPECIAL';

-- 2. Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck             uuid[] NOT NULL,
  room_code        text UNIQUE,
  status           text NOT NULL DEFAULT 'WAITING',
  matched_battle_id uuid REFERENCES battles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mq_deck_size CHECK (array_length(deck, 1) = 3),
  CONSTRAINT mq_status_values CHECK (status IN ('WAITING', 'MATCHED', 'CANCELLED'))
);

CREATE INDEX idx_mq_status ON matchmaking_queue(status) WHERE status = 'WAITING';
CREATE INDEX idx_mq_room ON matchmaking_queue(room_code) WHERE room_code IS NOT NULL;

-- 3. Add new columns to battles table
ALTER TABLE battles ADD COLUMN IF NOT EXISTS current_turn_player_id uuid REFERENCES users(id);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS turn_number integer NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS turn_deadline timestamptz;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_cooldowns jsonb NOT NULL DEFAULT '{}';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_cooldowns jsonb NOT NULL DEFAULT '{}';

-- 4. Add completed_at to battles (for history)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 5. RLS for matchmaking_queue
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mq_select_own" ON matchmaking_queue
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "mq_insert_own" ON matchmaking_queue
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "mq_update_own" ON matchmaking_queue
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "mq_delete_own" ON matchmaking_queue
  FOR DELETE USING (user_id = auth.uid());

-- Service role can read/write all matchmaking rows (for edge functions)
CREATE POLICY "mq_service_all" ON matchmaking_queue
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Battle history view
CREATE OR REPLACE VIEW battle_history AS
SELECT
  b.id,
  b.status,
  b.winner_id,
  b.xp_reward,
  b.turn_number,
  b.created_at,
  b.completed_at,
  b.challenger_id,
  b.opponent_id,
  b.challenger_deck,
  b.opponent_deck,
  uc.username AS challenger_name,
  uc.wallet_address AS challenger_wallet,
  uo.username AS opponent_name,
  uo.wallet_address AS opponent_wallet
FROM battles b
LEFT JOIN users uc ON uc.id = b.challenger_id
LEFT JOIN users uo ON uo.id = b.opponent_id
WHERE b.status = 'COMPLETED';

-- 7. Enable realtime for battle tables
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
