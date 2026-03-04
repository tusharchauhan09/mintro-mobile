// @ts-nocheck -- Deno edge function
// supabase/functions/battle-move/index.ts
// Process a battle move — ATTACK, SPECIAL, SWITCH, FORFEIT
// Server-authoritative: validates turn, calculates damage, updates state
// POST { battle_id, move_type, target_slot? }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { verifyJwt } from '../_shared/verify-jwt.ts';
import {
  calculateDamage,
  SPECIAL_ABILITIES,
  TURN_TIMEOUT_MS,
  XP_WIN_BASE,
  XP_PER_KO,
  XP_LOSS,
} from '../_shared/battle-mechanics.ts';

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

    const { battle_id, move_type, target_slot } = await req.json();
    const playerId = jwt.sub;

    // 1. Fetch battle
    const { data: battle, error: battleErr } = await supabaseAdmin
      .from('battles')
      .select('*')
      .eq('id', battle_id)
      .single();

    if (battleErr || !battle) {
      return new Response(
        JSON.stringify({ error: 'Battle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (battle.status !== 'ACTIVE') {
      return new Response(
        JSON.stringify({ error: 'Battle is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (battle.current_turn_player_id !== playerId) {
      return new Response(
        JSON.stringify({ error: 'Not your turn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Determine roles
    const isChallenger = playerId === battle.challenger_id;
    const myDeck = isChallenger ? battle.challenger_deck : battle.opponent_deck;
    const oppDeck = isChallenger ? battle.opponent_deck : battle.challenger_deck;
    const myHp = { ...(isChallenger ? battle.challenger_hp : battle.opponent_hp) };
    const oppHp = { ...(isChallenger ? battle.opponent_hp : battle.challenger_hp) };
    const myActiveIdx = isChallenger ? battle.active_challenger_card : battle.active_opponent_card;
    const oppActiveIdx = isChallenger ? battle.active_opponent_card : battle.active_challenger_card;
    const myCooldowns = { ...(isChallenger ? battle.challenger_cooldowns : battle.opponent_cooldowns) };
    const oppCooldowns = { ...(isChallenger ? battle.opponent_cooldowns : battle.challenger_cooldowns) };
    const opponentId = isChallenger ? battle.opponent_id : battle.challenger_id;

    const myActiveCardId = myDeck[myActiveIdx];
    const oppActiveCardId = oppDeck[oppActiveIdx];

    // Fetch card data for active cards
    const { data: myCard } = await supabaseAdmin
      .from('cards')
      .select('*, card_templates(*)')
      .eq('id', myActiveCardId)
      .single();

    const { data: oppCard } = await supabaseAdmin
      .from('cards')
      .select('*, card_templates(*)')
      .eq('id', oppActiveCardId)
      .single();

    let moveResult = {
      damage_dealt: 0,
      card_used: myActiveCardId,
      target_card: oppActiveCardId,
    };

    // ----------------------------------------------------------------
    // FORFEIT
    // ----------------------------------------------------------------
    if (move_type === 'FORFEIT') {
      // Count KO'd cards for XP
      const koCount = oppDeck.filter((id: string) => oppHp[id] <= 0).length;
      const winnerXp = XP_WIN_BASE + koCount * XP_PER_KO;

      await supabaseAdmin
        .from('battle_moves')
        .insert({
          battle_id,
          player_id: playerId,
          turn_number: battle.turn_number,
          move_type: 'FORFEIT',
          card_used: null,
          target_card: null,
          damage_dealt: 0,
        });

      // Update winner/loser stats
      await supabaseAdmin.rpc('', {}).catch(() => {}); // noop, update below

      const { data: winner } = await supabaseAdmin
        .from('users')
        .select('total_wins, win_streak, xp')
        .eq('id', opponentId)
        .single();

      if (winner) {
        await supabaseAdmin
          .from('users')
          .update({
            total_wins: winner.total_wins + 1,
            win_streak: winner.win_streak + 1,
            xp: winner.xp + winnerXp,
          })
          .eq('id', opponentId);
      }

      const { data: loser } = await supabaseAdmin
        .from('users')
        .select('total_losses, xp')
        .eq('id', playerId)
        .single();

      if (loser) {
        await supabaseAdmin
          .from('users')
          .update({
            total_losses: loser.total_losses + 1,
            win_streak: 0,
            xp: loser.xp + XP_LOSS,
          })
          .eq('id', playerId);
      }

      const updatedBattle = await supabaseAdmin
        .from('battles')
        .update({
          winner_id: opponentId,
          status: 'COMPLETED',
          xp_reward: winnerXp,
          completed_at: new Date().toISOString(),
        })
        .eq('id', battle_id)
        .select()
        .single();

      return new Response(
        JSON.stringify({ battle: updatedBattle.data, move_type: 'FORFEIT' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // SWITCH
    // ----------------------------------------------------------------
    if (move_type === 'SWITCH') {
      const switchTo = target_slot;
      if (switchTo === undefined || switchTo === myActiveIdx) {
        return new Response(
          JSON.stringify({ error: 'Invalid switch target' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const switchCardId = myDeck[switchTo];
      if (!switchCardId || myHp[switchCardId] <= 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot switch to a KO\'d card' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await supabaseAdmin
        .from('battle_moves')
        .insert({
          battle_id,
          player_id: playerId,
          turn_number: battle.turn_number,
          move_type: 'SWITCH',
          card_used: switchCardId,
          target_card: null,
          damage_dealt: 0,
        });

      // Decrement cooldowns
      for (const key of Object.keys(myCooldowns)) {
        myCooldowns[key] = Math.max(0, myCooldowns[key] - 1);
      }

      const updateData: Record<string, any> = {
        current_turn_player_id: opponentId,
        turn_number: battle.turn_number + 1,
        turn_deadline: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      };

      if (isChallenger) {
        updateData.active_challenger_card = switchTo;
        updateData.challenger_cooldowns = myCooldowns;
      } else {
        updateData.active_opponent_card = switchTo;
        updateData.opponent_cooldowns = myCooldowns;
      }

      const { data: updatedBattle } = await supabaseAdmin
        .from('battles')
        .update(updateData)
        .eq('id', battle_id)
        .select()
        .single();

      return new Response(
        JSON.stringify({ battle: updatedBattle, move_type: 'SWITCH' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // ATTACK
    // ----------------------------------------------------------------
    if (move_type === 'ATTACK') {
      if (!myCard || !oppCard) {
        return new Response(
          JSON.stringify({ error: 'Card data not found' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Check for Veil (dodge) — opponent has veil active
      const oppVeilKey = `veil_${oppActiveCardId}`;
      if (oppCooldowns[oppVeilKey] === -1) {
        // Veil active — dodge this attack
        delete oppCooldowns[oppVeilKey];

        await supabaseAdmin
          .from('battle_moves')
          .insert({
            battle_id,
            player_id: playerId,
            turn_number: battle.turn_number,
            move_type: 'ATTACK',
            card_used: myActiveCardId,
            target_card: oppActiveCardId,
            damage_dealt: 0,
          });

        // Decrement cooldowns
        for (const key of Object.keys(myCooldowns)) {
          if (myCooldowns[key] > 0) myCooldowns[key] = Math.max(0, myCooldowns[key] - 1);
        }
        for (const key of Object.keys(oppCooldowns)) {
          if (oppCooldowns[key] > 0) oppCooldowns[key] = Math.max(0, oppCooldowns[key] - 1);
        }

        const updateData: Record<string, any> = {
          current_turn_player_id: opponentId,
          turn_number: battle.turn_number + 1,
          turn_deadline: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
        };
        if (isChallenger) {
          updateData.challenger_cooldowns = myCooldowns;
          updateData.opponent_cooldowns = oppCooldowns;
        } else {
          updateData.opponent_cooldowns = myCooldowns;
          updateData.challenger_cooldowns = oppCooldowns;
        }

        const { data: updatedBattle } = await supabaseAdmin
          .from('battles')
          .update(updateData)
          .eq('id', battle_id)
          .select()
          .single();

        return new Response(
          JSON.stringify({ battle: updatedBattle, move_type: 'ATTACK', dodged: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const damage = calculateDamage(
        myCard.attack,
        oppCard.defense,
        myCard.card_templates.element,
        oppCard.card_templates.element,
      );

      oppHp[oppActiveCardId] = Math.max(0, oppHp[oppActiveCardId] - damage);
      moveResult.damage_dealt = damage;

      await supabaseAdmin
        .from('battle_moves')
        .insert({
          battle_id,
          player_id: playerId,
          turn_number: battle.turn_number,
          move_type: 'ATTACK',
          card_used: myActiveCardId,
          target_card: oppActiveCardId,
          damage_dealt: damage,
        });

      // Check if opponent's card is KO'd
      let newOppActiveIdx = oppActiveIdx;
      if (oppHp[oppActiveCardId] <= 0) {
        // Find next alive card for opponent
        const nextAlive = oppDeck.findIndex((id: string, idx: number) => idx !== oppActiveIdx && oppHp[id] > 0);
        if (nextAlive === -1) {
          // All opponent cards KO'd — player wins!
          const koCount = oppDeck.filter((id: string) => oppHp[id] <= 0).length;
          const winnerXp = XP_WIN_BASE + koCount * XP_PER_KO;

          // Update user stats
          const { data: winner } = await supabaseAdmin
            .from('users')
            .select('total_wins, win_streak, xp')
            .eq('id', playerId)
            .single();

          if (winner) {
            await supabaseAdmin
              .from('users')
              .update({
                total_wins: winner.total_wins + 1,
                win_streak: winner.win_streak + 1,
                xp: winner.xp + winnerXp,
              })
              .eq('id', playerId);
          }

          const { data: loserData } = await supabaseAdmin
            .from('users')
            .select('total_losses, xp')
            .eq('id', opponentId)
            .single();

          if (loserData) {
            await supabaseAdmin
              .from('users')
              .update({
                total_losses: loserData.total_losses + 1,
                win_streak: 0,
                xp: loserData.xp + XP_LOSS,
              })
              .eq('id', opponentId);
          }

          const updateData: Record<string, any> = {
            winner_id: playerId,
            status: 'COMPLETED',
            xp_reward: winnerXp,
            completed_at: new Date().toISOString(),
          };
          if (isChallenger) {
            updateData.opponent_hp = oppHp;
          } else {
            updateData.challenger_hp = oppHp;
          }

          const { data: updatedBattle } = await supabaseAdmin
            .from('battles')
            .update(updateData)
            .eq('id', battle_id)
            .select()
            .single();

          return new Response(
            JSON.stringify({ battle: updatedBattle, move_type: 'ATTACK', damage, winner: playerId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        newOppActiveIdx = nextAlive;
      }

      // Decrement cooldowns
      for (const key of Object.keys(myCooldowns)) {
        if (myCooldowns[key] > 0) myCooldowns[key] = Math.max(0, myCooldowns[key] - 1);
      }
      for (const key of Object.keys(oppCooldowns)) {
        if (oppCooldowns[key] > 0) oppCooldowns[key] = Math.max(0, oppCooldowns[key] - 1);
      }

      const updateData: Record<string, any> = {
        current_turn_player_id: opponentId,
        turn_number: battle.turn_number + 1,
        turn_deadline: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      };

      if (isChallenger) {
        updateData.opponent_hp = oppHp;
        updateData.active_opponent_card = newOppActiveIdx;
        updateData.challenger_cooldowns = myCooldowns;
        updateData.opponent_cooldowns = oppCooldowns;
      } else {
        updateData.challenger_hp = oppHp;
        updateData.active_challenger_card = newOppActiveIdx;
        updateData.opponent_cooldowns = myCooldowns;
        updateData.challenger_cooldowns = oppCooldowns;
      }

      const { data: updatedBattle } = await supabaseAdmin
        .from('battles')
        .update(updateData)
        .eq('id', battle_id)
        .select()
        .single();

      return new Response(
        JSON.stringify({ battle: updatedBattle, move_type: 'ATTACK', damage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----------------------------------------------------------------
    // SPECIAL
    // ----------------------------------------------------------------
    if (move_type === 'SPECIAL') {
      if (!myCard || !oppCard) {
        return new Response(
          JSON.stringify({ error: 'Card data not found' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const element = myCard.card_templates.element;
      const ability = SPECIAL_ABILITIES[element];
      if (!ability) {
        return new Response(
          JSON.stringify({ error: 'No special ability for element' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Check cooldown
      const cooldownKey = `${element}_${myActiveCardId}`;
      if (myCooldowns[cooldownKey] > 0) {
        return new Response(
          JSON.stringify({ error: 'Ability on cooldown', turns_remaining: myCooldowns[cooldownKey] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      let damage = 0;
      let specialEffect = element;
      let newOppActiveIdx = oppActiveIdx;

      switch (element) {
        case 'FIRE': {
          // Blaze: +50% attack this turn
          damage = calculateDamage(
            myCard.attack,
            oppCard.defense,
            element,
            oppCard.card_templates.element,
            1.5,
          );
          oppHp[oppActiveCardId] = Math.max(0, oppHp[oppActiveCardId] - damage);
          break;
        }
        case 'WATER': {
          // Tidal Shield: +100% defense — reflected as reduced damage (basically skip turn but gain shield)
          // For simplicity: deal reduced damage with double defense
          damage = calculateDamage(
            myCard.attack,
            oppCard.defense,
            element,
            oppCard.card_templates.element,
            0.5,
          );
          oppHp[oppActiveCardId] = Math.max(0, oppHp[oppActiveCardId] - damage);
          break;
        }
        case 'EARTH': {
          // Fortify: Heal 20% max HP
          const { data: originalCard } = await supabaseAdmin
            .from('cards')
            .select('hp')
            .eq('id', myActiveCardId)
            .single();
          const maxHp = originalCard?.hp ?? myCard.hp;
          const healAmount = Math.floor(maxHp * 0.2);
          myHp[myActiveCardId] = Math.min(maxHp, myHp[myActiveCardId] + healAmount);
          damage = -healAmount; // negative = heal
          break;
        }
        case 'AIR': {
          // Gust: Force opponent to switch to a random alive card
          const aliveCards = oppDeck
            .map((id: string, idx: number) => ({ id, idx }))
            .filter((c: any) => c.idx !== oppActiveIdx && oppHp[c.id] > 0);

          if (aliveCards.length > 0) {
            const randomTarget = aliveCards[Math.floor(Math.random() * aliveCards.length)];
            newOppActiveIdx = randomTarget.idx;
          }
          // If no other alive cards, gust does nothing extra
          break;
        }
        case 'LIGHTNING': {
          // Surge: Attack twice at half damage each
          const hit1 = calculateDamage(
            myCard.attack,
            oppCard.defense,
            element,
            oppCard.card_templates.element,
            0.6,
          );
          oppHp[oppActiveCardId] = Math.max(0, oppHp[oppActiveCardId] - hit1);
          const hit2 = calculateDamage(
            myCard.attack,
            oppCard.defense,
            element,
            oppCard.card_templates.element,
            0.6,
          );
          oppHp[oppActiveCardId] = Math.max(0, oppHp[oppActiveCardId] - hit2);
          damage = hit1 + hit2;
          break;
        }
        case 'SHADOW': {
          // Veil: Dodge the next attack — mark with special cooldown flag
          const veilKey = `veil_${myActiveCardId}`;
          myCooldowns[veilKey] = -1; // special flag: -1 = veil active
          break;
        }
      }

      // Set ability cooldown
      myCooldowns[cooldownKey] = ability.cooldown;

      await supabaseAdmin
        .from('battle_moves')
        .insert({
          battle_id,
          player_id: playerId,
          turn_number: battle.turn_number,
          move_type: 'SPECIAL',
          card_used: myActiveCardId,
          target_card: damage > 0 ? oppActiveCardId : null,
          damage_dealt: Math.abs(damage),
        });

      // Check win condition after damage specials
      if (oppHp[oppActiveCardId] <= 0 && damage > 0) {
        const nextAlive = oppDeck.findIndex((id: string, idx: number) => idx !== oppActiveIdx && oppHp[id] > 0);
        if (nextAlive === -1) {
          // Player wins
          const koCount = oppDeck.filter((id: string) => oppHp[id] <= 0).length;
          const winnerXp = XP_WIN_BASE + koCount * XP_PER_KO;

          const { data: winner } = await supabaseAdmin
            .from('users')
            .select('total_wins, win_streak, xp')
            .eq('id', playerId)
            .single();

          if (winner) {
            await supabaseAdmin
              .from('users')
              .update({
                total_wins: winner.total_wins + 1,
                win_streak: winner.win_streak + 1,
                xp: winner.xp + winnerXp,
              })
              .eq('id', playerId);
          }

          const { data: loserData } = await supabaseAdmin
            .from('users')
            .select('total_losses, xp')
            .eq('id', opponentId)
            .single();

          if (loserData) {
            await supabaseAdmin
              .from('users')
              .update({
                total_losses: loserData.total_losses + 1,
                win_streak: 0,
                xp: loserData.xp + XP_LOSS,
              })
              .eq('id', opponentId);
          }

          const updateData: Record<string, any> = {
            winner_id: playerId,
            status: 'COMPLETED',
            xp_reward: winnerXp,
            completed_at: new Date().toISOString(),
          };
          if (isChallenger) {
            updateData.opponent_hp = oppHp;
            updateData.challenger_cooldowns = myCooldowns;
          } else {
            updateData.challenger_hp = oppHp;
            updateData.opponent_cooldowns = myCooldowns;
          }

          const { data: updatedBattle } = await supabaseAdmin
            .from('battles')
            .update(updateData)
            .eq('id', battle_id)
            .select()
            .single();

          return new Response(
            JSON.stringify({ battle: updatedBattle, move_type: 'SPECIAL', special: element, damage, winner: playerId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        newOppActiveIdx = nextAlive;
      }

      // Decrement cooldowns (except the one we just set)
      for (const key of Object.keys(myCooldowns)) {
        if (key !== cooldownKey && key.indexOf('veil_') !== 0 && myCooldowns[key] > 0) {
          myCooldowns[key] = Math.max(0, myCooldowns[key] - 1);
        }
      }
      for (const key of Object.keys(oppCooldowns)) {
        if (oppCooldowns[key] > 0) oppCooldowns[key] = Math.max(0, oppCooldowns[key] - 1);
      }

      const updateData: Record<string, any> = {
        current_turn_player_id: opponentId,
        turn_number: battle.turn_number + 1,
        turn_deadline: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      };

      if (isChallenger) {
        updateData.opponent_hp = oppHp;
        updateData.challenger_hp = myHp;
        updateData.active_opponent_card = newOppActiveIdx;
        updateData.challenger_cooldowns = myCooldowns;
        updateData.opponent_cooldowns = oppCooldowns;
      } else {
        updateData.challenger_hp = oppHp;
        updateData.opponent_hp = myHp;
        updateData.active_challenger_card = newOppActiveIdx;
        updateData.opponent_cooldowns = myCooldowns;
        updateData.challenger_cooldowns = oppCooldowns;
      }

      const { data: updatedBattle } = await supabaseAdmin
        .from('battles')
        .update(updateData)
        .eq('id', battle_id)
        .select()
        .single();

      return new Response(
        JSON.stringify({ battle: updatedBattle, move_type: 'SPECIAL', special: element, damage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid move type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[battle-move]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
