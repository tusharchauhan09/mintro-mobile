-- ============================================================================
-- Atomic marketplace purchase function + minor fixes
-- ============================================================================

-- 1. Drop redundant index (UNIQUE constraint already creates one)
DROP INDEX IF EXISTS idx_users_wallet;

-- 2. Atomic marketplace purchase — runs listing update + card transfer in one tx
CREATE OR REPLACE FUNCTION execute_marketplace_purchase(
  p_listing_id uuid,
  p_buyer_id   uuid,
  p_tx_signature text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_id uuid;
  v_rows   integer;
BEGIN
  -- Lock and update the listing in one step
  UPDATE listings
  SET    status       = 'SOLD',
         buyer_id     = p_buyer_id,
         tx_signature = p_tx_signature,
         sold_at      = now()
  WHERE  id     = p_listing_id
  AND    status = 'ACTIVE'
  RETURNING card_id INTO v_card_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Listing already sold or not found';
  END IF;

  -- Transfer card ownership
  UPDATE cards
  SET    owner_id = p_buyer_id
  WHERE  id = v_card_id;
END;
$$;

-- 3. Make card_used nullable for FORFEIT moves
ALTER TABLE battle_moves ALTER COLUMN card_used DROP NOT NULL;
