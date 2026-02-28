// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
// supabase/functions/mint-pack/index.ts
// Opens a card pack — rolls rarity weights, creates card records.
// Phase 1: Local cards only (no on-chain mint). NFT minting added later.
// POST { wallet_address } → { cards: Card[] }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { verifyJwt } from '../_shared/verify-jwt.ts';

const CARDS_PER_PACK = 3;
const ENERGY_COST = 10;
const MAX_SERIAL_RETRIES = 3;

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

    const { wallet_address } = await req.json();

    // Ensure the JWT wallet matches the request
    if (!wallet_address || wallet_address !== jwt.wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Look up user and check energy
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, energy')
      .eq('wallet_address', wallet_address)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (user.energy < ENERGY_COST) {
      return new Response(
        JSON.stringify({ error: 'Not enough energy', required: ENERGY_COST, current: user.energy }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Deduct energy
    await supabaseAdmin
      .from('users')
      .update({ energy: user.energy - ENERGY_COST })
      .eq('id', user.id);

    // 4. Fetch all card templates with their spawn weights
    const { data: templates, error: tplError } = await supabaseAdmin
      .from('card_templates')
      .select('*')
      .gt('spawn_weight', 0);

    if (tplError || !templates?.length) {
      throw tplError ?? new Error('No card templates available');
    }

    // 5. Build weighted pool and roll cards
    const totalWeight = templates.reduce((sum: number, t: any) => sum + t.spawn_weight, 0);
    const cards = [];

    for (let i = 0; i < CARDS_PER_PACK; i++) {
      let roll = Math.random() * totalWeight;
      let selected = templates[0];

      for (const tpl of templates) {
        roll -= tpl.spawn_weight;
        if (roll <= 0) {
          selected = tpl;
          break;
        }
      }

      // 6. Insert card with retry for serial number conflicts
      let inserted = null;
      for (let attempt = 0; attempt < MAX_SERIAL_RETRIES; attempt++) {
        // Get max serial for this template
        const { data: maxRow } = await supabaseAdmin
          .from('cards')
          .select('serial_number')
          .eq('template_id', selected.id)
          .order('serial_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const serialNumber = (maxRow?.serial_number ?? 0) + 1;

        const { data, error: insertError } = await supabaseAdmin
          .from('cards')
          .insert({
            template_id: selected.id,
            owner_id: user.id,
            serial_number: serialNumber,
            level: 1,
            xp: 0,
            attack: selected.base_attack,
            defense: selected.base_defense,
            hp: selected.base_hp,
          })
          .select('*, card_templates(*)')
          .single();

        if (!insertError && data) {
          inserted = data;
          break;
        }

        // If unique constraint violation, retry with a new serial
        if (insertError?.code === '23505') continue;
        throw insertError;
      }

      if (!inserted) throw new Error('Failed to allocate serial number');
      cards.push(inserted);
    }

    return new Response(
      JSON.stringify({ cards }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[mint-pack]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
