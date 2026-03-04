// @ts-nocheck -- Deno edge function
// supabase/functions/battle-queue/index.ts
// Matchmaking queue — join random, create/join room, cancel
// POST { action, deck?, room_code? }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { verifyJwt } from '../_shared/verify-jwt.ts';
import { generateRoomCode, TURN_TIMEOUT_MS } from '../_shared/battle-mechanics.ts';

async function buildHpMap(deck: string[]) {
  const hp: Record<string, number> = {};
  for (const cardId of deck) {
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('hp')
      .eq('id', cardId)
      .single();
    if (card) hp[cardId] = card.hp;
  }
  return hp;
}

async function createBattle(player1: { user_id: string; deck: string[] }, player2: { user_id: string; deck: string[] }) {
  const [challengerHp, opponentHp] = await Promise.all([
    buildHpMap(player1.deck),
    buildHpMap(player2.deck),
  ]);

  const { data: battle, error } = await supabaseAdmin
    .from('battles')
    .insert({
      challenger_id: player1.user_id,
      opponent_id: player2.user_id,
      challenger_deck: player1.deck,
      opponent_deck: player2.deck,
      challenger_hp: challengerHp,
      opponent_hp: opponentHp,
      active_challenger_card: 0,
      active_opponent_card: 0,
      current_turn_player_id: player1.user_id,
      turn_number: 1,
      turn_deadline: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      challenger_cooldowns: {},
      opponent_cooldowns: {},
      status: 'ACTIVE',
      xp_reward: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return battle;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jwt = await verifyJwt(req);
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { action } = body;
    const userId = jwt.sub;

    // ----------------------------------------------------------------
    // JOIN RANDOM MATCHMAKING
    // ----------------------------------------------------------------
    if (action === 'join_random') {
      const { deck } = body;
      if (!deck || deck.length !== 3) {
        return new Response(
          JSON.stringify({ error: 'Deck must have exactly 3 cards' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Cancel any existing queue entries for this user
      await supabaseAdmin
        .from('matchmaking_queue')
        .update({ status: 'CANCELLED' })
        .eq('user_id', userId)
        .eq('status', 'WAITING');

      // Check if someone else is waiting (random — no room_code)
      const { data: waiting } = await supabaseAdmin
        .from('matchmaking_queue')
        .select('*')
        .eq('status', 'WAITING')
        .is('room_code', null)
        .neq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (waiting) {
        // Match found — create battle
        const battle = await createBattle(
          { user_id: waiting.user_id, deck: waiting.deck },
          { user_id: userId, deck },
        );

        // Update the waiting player's queue entry
        await supabaseAdmin
          .from('matchmaking_queue')
          .update({ status: 'MATCHED', matched_battle_id: battle.id })
          .eq('id', waiting.id);

        // Insert our entry as already matched
        await supabaseAdmin
          .from('matchmaking_queue')
          .insert({
            user_id: userId,
            deck,
            status: 'MATCHED',
            matched_battle_id: battle.id,
          });

        return new Response(
          JSON.stringify({ status: 'MATCHED', battle_id: battle.id, battle }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // No one waiting — join the queue
      const { data: entry, error: insertError } = await supabaseAdmin
        .from('matchmaking_queue')
        .insert({ user_id: userId, deck, status: 'WAITING' })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ status: 'WAITING', queue_id: entry.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // CREATE ROOM
    // ----------------------------------------------------------------
    if (action === 'create_room') {
      const { deck } = body;
      if (!deck || deck.length !== 3) {
        return new Response(
          JSON.stringify({ error: 'Deck must have exactly 3 cards' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Cancel existing entries
      await supabaseAdmin
        .from('matchmaking_queue')
        .update({ status: 'CANCELLED' })
        .eq('user_id', userId)
        .eq('status', 'WAITING');

      // Generate unique room code (retry on collision)
      let roomCode = '';
      let inserted = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabaseAdmin
          .from('matchmaking_queue')
          .insert({ user_id: userId, deck, room_code: roomCode, status: 'WAITING' })
          .select()
          .single();

        if (!error && data) {
          inserted = data;
          break;
        }
        if (error?.code === '23505') continue; // unique violation, retry
        throw error;
      }

      if (!inserted) throw new Error('Failed to generate unique room code');

      return new Response(
        JSON.stringify({ status: 'WAITING', queue_id: inserted.id, room_code: roomCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // JOIN ROOM
    // ----------------------------------------------------------------
    if (action === 'join_room') {
      const { room_code, deck } = body;
      if (!room_code || !deck || deck.length !== 3) {
        return new Response(
          JSON.stringify({ error: 'Room code and 3-card deck required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Find the waiting room
      const { data: room } = await supabaseAdmin
        .from('matchmaking_queue')
        .select('*')
        .eq('room_code', room_code.toUpperCase())
        .eq('status', 'WAITING')
        .maybeSingle();

      if (!room) {
        return new Response(
          JSON.stringify({ error: 'Room not found or already started' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (room.user_id === userId) {
        return new Response(
          JSON.stringify({ error: 'Cannot join your own room' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Create the battle
      const battle = await createBattle(
        { user_id: room.user_id, deck: room.deck },
        { user_id: userId, deck },
      );

      // Update host's queue entry
      await supabaseAdmin
        .from('matchmaking_queue')
        .update({ status: 'MATCHED', matched_battle_id: battle.id })
        .eq('id', room.id);

      // Insert joiner's entry
      await supabaseAdmin
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          deck,
          status: 'MATCHED',
          matched_battle_id: battle.id,
        });

      return new Response(
        JSON.stringify({ status: 'MATCHED', battle_id: battle.id, battle }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // CANCEL
    // ----------------------------------------------------------------
    if (action === 'cancel') {
      const { queue_id } = body;

      if (queue_id) {
        await supabaseAdmin
          .from('matchmaking_queue')
          .update({ status: 'CANCELLED' })
          .eq('id', queue_id)
          .eq('user_id', userId);
      } else {
        // Cancel all waiting entries for user
        await supabaseAdmin
          .from('matchmaking_queue')
          .update({ status: 'CANCELLED' })
          .eq('user_id', userId)
          .eq('status', 'WAITING');
      }

      return new Response(
        JSON.stringify({ status: 'CANCELLED' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[battle-queue]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
