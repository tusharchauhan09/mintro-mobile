// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
// supabase/functions/marketplace-buy/index.ts
// Processes a marketplace purchase — verifies SOL transfer, transfers card ownership.
// Phase 1: Local transfer only (no on-chain NFT transfer). Added later.
// POST { listing_id, tx_signature? } → { listing }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { verifyJwt } from '../_shared/verify-jwt.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT
    const jwt = await verifyJwt(req);
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { listing_id, tx_signature } = await req.json();

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'listing_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Look up buyer from JWT wallet
    const { data: buyer, error: buyerError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', jwt.wallet_address)
      .single();

    if (buyerError || !buyer) {
      return new Response(
        JSON.stringify({ error: 'Buyer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Fetch listing — must be ACTIVE
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .eq('status', 'ACTIVE')
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: 'Listing not found or already sold' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Prevent self-purchase
    if (listing.seller_id === buyer.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot buy your own listing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 5. Atomic purchase via RPC — update listing + transfer card in one transaction
    const { error: rpcError } = await supabaseAdmin.rpc(
      'execute_marketplace_purchase',
      {
        p_listing_id: listing_id,
        p_buyer_id: buyer.id,
        p_tx_signature: tx_signature ?? null,
      },
    );

    if (rpcError) {
      // Check for concurrent purchase (function raises exception)
      if (rpcError.message?.includes('already sold')) {
        return new Response(
          JSON.stringify({ error: 'Listing was already purchased' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw rpcError;
    }

    // 6. Fetch updated listing with full card data
    const { data: updatedListing } = await supabaseAdmin
      .from('listings')
      .select('*, cards(*, card_templates(*))')
      .eq('id', listing_id)
      .single();

    return new Response(
      JSON.stringify({ listing: updatedListing }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[marketplace-buy]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
