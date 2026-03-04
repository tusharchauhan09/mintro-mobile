import { create } from 'zustand';
import type { Battle, BattleMove, CardWithTemplate, MoveType } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

function getSupabase() {
  return require('@/lib/supabase').supabase as import('@supabase/supabase-js').SupabaseClient;
}

function getAuthState() {
  const { useAuthStore } = require('@/stores/auth-store');
  return useAuthStore.getState() as {
    userId: string | null;
    sessionToken: string | null;
  };
}

export type MatchmakingPhase = 'idle' | 'searching' | 'creating_room' | 'waiting_room' | 'matched';
export type BattlePhase = 'idle' | 'matchmaking' | 'battle' | 'result';

export interface MoveResult {
  move_type: MoveType;
  damage?: number;
  special?: string;
  dodged?: boolean;
  winner?: string;
}

interface BattleState {
  // Matchmaking
  matchmakingStatus: MatchmakingPhase;
  queueId: string | null;
  roomCode: string | null;

  // Battle
  battleId: string | null;
  battle: Battle | null;
  battleCards: Record<string, CardWithTemplate>;
  moves: BattleMove[];

  // Turn
  isMyTurn: boolean;
  turnTimeLeft: number;

  // UI
  lastMoveResult: MoveResult | null;
  battlePhase: BattlePhase;
  error: string | null;
  loading: boolean;

  // Channels (not serialized)
  _matchmakingChannel: RealtimeChannel | null;
  _battleChannel: RealtimeChannel | null;
  _turnTimer: ReturnType<typeof setInterval> | null;

  // Match history
  matchHistory: BattleHistoryItem[];

  // Actions
  joinRandomQueue: (deck: string[]) => Promise<void>;
  createRoom: (deck: string[]) => Promise<string>;
  joinRoom: (roomCode: string, deck: string[]) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  submitMove: (moveType: MoveType, targetSlot?: number) => Promise<void>;
  forfeit: () => Promise<void>;
  subscribeToBattle: (battleId: string) => void;
  subscribeToMatchmaking: (queueId: string) => void;
  unsubscribeAll: () => void;
  resetBattle: () => void;
  fetchBattleCards: (battleId: string) => Promise<void>;
  fetchMatchHistory: () => Promise<void>;
  startTurnTimer: () => void;
  stopTurnTimer: () => void;
}

export interface BattleHistoryItem {
  id: string;
  winner_id: string | null;
  xp_reward: number;
  turn_number: number;
  created_at: string;
  completed_at: string | null;
  challenger_id: string;
  opponent_id: string | null;
  challenger_name: string | null;
  opponent_name: string | null;
  challenger_wallet: string | null;
  opponent_wallet: string | null;
}

async function callEdgeFunction(fn: string, body: Record<string, unknown>) {
  const { sessionToken } = getAuthState();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  matchmakingStatus: 'idle',
  queueId: null,
  roomCode: null,
  battleId: null,
  battle: null,
  battleCards: {},
  moves: [],
  isMyTurn: false,
  turnTimeLeft: 30,
  lastMoveResult: null,
  battlePhase: 'idle',
  error: null,
  loading: false,
  _matchmakingChannel: null,
  _battleChannel: null,
  _turnTimer: null,
  matchHistory: [],

  // ----------------------------------------------------------------
  // MATCHMAKING
  // ----------------------------------------------------------------
  joinRandomQueue: async (deck) => {
    set({ loading: true, error: null, matchmakingStatus: 'searching', battlePhase: 'matchmaking' });
    try {
      const data = await callEdgeFunction('battle-queue', { action: 'join_random', deck });

      if (data.status === 'MATCHED') {
        set({
          matchmakingStatus: 'matched',
          battleId: data.battle_id,
          battle: data.battle,
          loading: false,
        });
        get().fetchBattleCards(data.battle_id);
      } else {
        set({ queueId: data.queue_id, loading: false });
        get().subscribeToMatchmaking(data.queue_id);
      }
    } catch (err: any) {
      set({ error: err.message, loading: false, matchmakingStatus: 'idle', battlePhase: 'idle' });
    }
  },

  createRoom: async (deck) => {
    set({ loading: true, error: null, matchmakingStatus: 'creating_room', battlePhase: 'matchmaking' });
    try {
      const data = await callEdgeFunction('battle-queue', { action: 'create_room', deck });
      set({
        queueId: data.queue_id,
        roomCode: data.room_code,
        matchmakingStatus: 'waiting_room',
        loading: false,
      });
      get().subscribeToMatchmaking(data.queue_id);
      return data.room_code as string;
    } catch (err: any) {
      set({ error: err.message, loading: false, matchmakingStatus: 'idle', battlePhase: 'idle' });
      throw err;
    }
  },

  joinRoom: async (roomCode, deck) => {
    set({ loading: true, error: null, matchmakingStatus: 'searching', battlePhase: 'matchmaking' });
    try {
      const data = await callEdgeFunction('battle-queue', {
        action: 'join_room',
        room_code: roomCode,
        deck,
      });
      set({
        matchmakingStatus: 'matched',
        battleId: data.battle_id,
        battle: data.battle,
        loading: false,
      });
      get().fetchBattleCards(data.battle_id);
    } catch (err: any) {
      set({ error: err.message, loading: false, matchmakingStatus: 'idle', battlePhase: 'idle' });
      throw err;
    }
  },

  cancelMatchmaking: async () => {
    const { queueId } = get();
    try {
      await callEdgeFunction('battle-queue', { action: 'cancel', queue_id: queueId });
    } catch (_) {
      // Ignore cancel errors
    }
    get().unsubscribeAll();
    set({
      matchmakingStatus: 'idle',
      battlePhase: 'idle',
      queueId: null,
      roomCode: null,
    });
  },

  // ----------------------------------------------------------------
  // REALTIME SUBSCRIPTIONS
  // ----------------------------------------------------------------
  subscribeToMatchmaking: (queueId) => {
    const supabase = getSupabase();
    const existing = get()._matchmakingChannel;
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`matchmaking:${queueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `id=eq.${queueId}`,
        },
        (payload: any) => {
          if (payload.new.status === 'MATCHED' && payload.new.matched_battle_id) {
            set({
              matchmakingStatus: 'matched',
              battleId: payload.new.matched_battle_id,
            });
            get().fetchBattleCards(payload.new.matched_battle_id);

            // Fetch the battle data
            supabase
              .from('battles')
              .select('*')
              .eq('id', payload.new.matched_battle_id)
              .single()
              .then(({ data }) => {
                if (data) set({ battle: data });
              });
          }
        },
      )
      .subscribe();

    set({ _matchmakingChannel: channel });
  },

  subscribeToBattle: (battleId) => {
    const supabase = getSupabase();
    const existing = get()._battleChannel;
    if (existing) supabase.removeChannel(existing);

    const { userId } = getAuthState();

    const channel = supabase
      .channel(`battle:${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        (payload: any) => {
          const updated = payload.new as Battle;
          set({
            battle: updated,
            isMyTurn: updated.current_turn_player_id === userId,
          });

          if (updated.status === 'COMPLETED') {
            get().stopTurnTimer();
            set({ battlePhase: 'result' });
          } else {
            // Restart turn timer
            get().startTurnTimer();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_moves',
          filter: `battle_id=eq.${battleId}`,
        },
        (payload: any) => {
          const move = payload.new as BattleMove;
          set((s) => ({
            moves: [...s.moves, move],
            lastMoveResult: {
              move_type: move.move_type,
              damage: move.damage_dealt ?? undefined,
            },
          }));
        },
      )
      .subscribe();

    set({
      _battleChannel: channel,
      battlePhase: 'battle',
      isMyTurn: get().battle?.current_turn_player_id === userId,
    });

    get().startTurnTimer();
  },

  unsubscribeAll: () => {
    const supabase = getSupabase();
    const { _matchmakingChannel, _battleChannel } = get();
    if (_matchmakingChannel) supabase.removeChannel(_matchmakingChannel);
    if (_battleChannel) supabase.removeChannel(_battleChannel);
    get().stopTurnTimer();
    set({ _matchmakingChannel: null, _battleChannel: null });
  },

  // ----------------------------------------------------------------
  // BATTLE ACTIONS
  // ----------------------------------------------------------------
  submitMove: async (moveType, targetSlot) => {
    const { battleId } = get();
    if (!battleId) return;
    set({ loading: true, error: null });
    try {
      const data = await callEdgeFunction('battle-move', {
        battle_id: battleId,
        move_type: moveType,
        target_slot: targetSlot,
      });
      set({
        loading: false,
        lastMoveResult: {
          move_type: moveType,
          damage: data.damage,
          special: data.special,
          dodged: data.dodged,
          winner: data.winner,
        },
      });
      // Battle update comes via realtime subscription
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  forfeit: async () => {
    const { battleId } = get();
    if (!battleId) return;
    set({ loading: true });
    try {
      await callEdgeFunction('battle-move', {
        battle_id: battleId,
        move_type: 'FORFEIT',
      });
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // ----------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------
  fetchBattleCards: async (battleId) => {
    const supabase = getSupabase();
    const { data: battle } = await supabase
      .from('battles')
      .select('challenger_deck, opponent_deck')
      .eq('id', battleId)
      .single();

    if (!battle) return;

    const allCardIds = [
      ...(battle.challenger_deck ?? []),
      ...(battle.opponent_deck ?? []),
    ];

    const { data: cards } = await supabase
      .from('cards')
      .select('*, card_templates(*)')
      .in('id', allCardIds);

    if (cards) {
      const cardMap: Record<string, CardWithTemplate> = {};
      for (const card of cards) {
        cardMap[card.id] = card as CardWithTemplate;
      }
      set({ battleCards: cardMap });
    }
  },

  fetchMatchHistory: async () => {
    const supabase = getSupabase();
    const { userId } = getAuthState();
    if (!userId) return;

    const { data } = await supabase
      .from('battles')
      .select(`
        id, winner_id, xp_reward, turn_number, created_at, completed_at,
        challenger_id, opponent_id,
        challenger:users!battles_challenger_id_fkey(username, wallet_address),
        opponent:users!battles_opponent_id_fkey(username, wallet_address)
      `)
      .eq('status', 'COMPLETED')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (data) {
      const history: BattleHistoryItem[] = data.map((b: any) => ({
        id: b.id,
        winner_id: b.winner_id,
        xp_reward: b.xp_reward,
        turn_number: b.turn_number,
        created_at: b.created_at,
        completed_at: b.completed_at,
        challenger_id: b.challenger_id,
        opponent_id: b.opponent_id,
        challenger_name: b.challenger?.username ?? null,
        opponent_name: b.opponent?.username ?? null,
        challenger_wallet: b.challenger?.wallet_address ?? null,
        opponent_wallet: b.opponent?.wallet_address ?? null,
      }));
      set({ matchHistory: history });
    }
  },

  startTurnTimer: () => {
    const { _turnTimer } = get();
    if (_turnTimer) clearInterval(_turnTimer);

    const battle = get().battle;
    if (!battle?.turn_deadline) return;

    const updateTimer = () => {
      const deadline = new Date(get().battle?.turn_deadline ?? '').getTime();
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      set({ turnTimeLeft: remaining });

      if (remaining <= 0) {
        get().stopTurnTimer();
        // Auto-forfeit if it's our turn and timer expired
        const { isMyTurn } = get();
        if (isMyTurn) {
          get().forfeit();
        }
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    set({ _turnTimer: timer });
  },

  stopTurnTimer: () => {
    const { _turnTimer } = get();
    if (_turnTimer) {
      clearInterval(_turnTimer);
      set({ _turnTimer: null });
    }
  },

  resetBattle: () => {
    get().unsubscribeAll();
    set({
      matchmakingStatus: 'idle',
      queueId: null,
      roomCode: null,
      battleId: null,
      battle: null,
      battleCards: {},
      moves: [],
      isMyTurn: false,
      turnTimeLeft: 30,
      lastMoveResult: null,
      battlePhase: 'idle',
      error: null,
      loading: false,
    });
  },
}));
