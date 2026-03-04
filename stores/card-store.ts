import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardTemplate, CardWithTemplate, Listing } from '@/types/database';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** Lazy import — avoids initializing Supabase client if credentials are invalid. */
function getSupabase() {
  return require('@/lib/supabase').supabase as import('@supabase/supabase-js').SupabaseClient;
}

/** Get current connected wallet address (or null). */
function getActiveWallet(): string | null {
  const { useWalletStore } = require('@/stores/wallet-store');
  return useWalletStore.getState().connectedPublicKey;
}

type ListingWithCard = Listing & { cards: CardWithTemplate };

interface CardState {
  // --- data ---
  templates: CardTemplate[];
  myCards: CardWithTemplate[];
  activeListings: ListingWithCard[];
  deck: string[]; // up to 3 card IDs chosen for battle (derived from active wallet)
  /** Per-wallet deck storage keyed by wallet address. */
  _decks: Record<string, string[]>;

  // --- loading states ---
  templatesLoading: boolean;
  cardsLoading: boolean;
  listingsLoading: boolean;
  mintingPack: boolean;

  // --- deck actions ---
  setDeck: (ids: string[]) => void;
  toggleDeckCard: (cardId: string) => void;
  setDeckSlot: (slotIndex: number, cardId: string) => void;

  /** Clear user-specific data on logout/disconnect. Deck is preserved in _decks. */
  clearCards: () => void;

  // --- actions ---
  fetchTemplates: () => Promise<void>;
  fetchMyCards: (walletAddress: string) => Promise<void>;
  fetchActiveListings: () => Promise<void>;
  openPack: (walletAddress: string, token: string) => Promise<CardWithTemplate[] | null>;
  listCard: (cardId: string, sellerWallet: string, priceSol: number) => Promise<boolean>;
  cancelListing: (listingId: string) => Promise<boolean>;
}

export const useCardStore = create<CardState>()(
  persist(
  (set, get) => ({
  templates: [],
  myCards: [],
  activeListings: [],
  deck: [],
  _decks: {},
  templatesLoading: false,
  cardsLoading: false,
  listingsLoading: false,
  mintingPack: false,

  setDeck: (ids: string[]) => {
    const newDeck = ids.slice(0, 3);
    const wallet = getActiveWallet();
    const _decks = { ...get()._decks };
    if (wallet) _decks[wallet] = newDeck;
    set({ deck: newDeck, _decks });
  },

  toggleDeckCard: (cardId: string) => {
    const { deck, _decks } = get();
    const wallet = getActiveWallet();
    let newDeck: string[];
    if (deck.includes(cardId)) {
      newDeck = deck.filter((id) => id !== cardId);
    } else if (deck.length < 3) {
      newDeck = [...deck, cardId];
    } else {
      return;
    }
    const updatedDecks = { ..._decks };
    if (wallet) updatedDecks[wallet] = newDeck;
    set({ deck: newDeck, _decks: updatedDecks });
  },

  setDeckSlot: (slotIndex: number, cardId: string) => {
    const { deck, _decks } = get();
    const wallet = getActiveWallet();
    // Remove card if already in deck (prevent duplicates)
    const filtered = deck.filter((id) => id !== cardId);
    // Pad to 3 slots for positional access
    const padded = [filtered[0] ?? '', filtered[1] ?? '', filtered[2] ?? ''];
    // Place card at target slot
    padded[slotIndex] = cardId;
    // Strip empty strings
    const newDeck = padded.filter(Boolean);
    const updatedDecks = { ..._decks };
    if (wallet) updatedDecks[wallet] = newDeck;
    set({ deck: newDeck, _decks: updatedDecks });
  },

  clearCards: () => {
    set({ myCards: [], activeListings: [], deck: [] });
  },

  fetchTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const { data, error } = await getSupabase()
        .from('card_templates')
        .select('*')
        .order('rarity');

      if (error) throw error;
      set({ templates: (data as CardTemplate[]) ?? [] });
    } catch (e) {
      if (__DEV__) console.warn('[card-store] fetchTemplates failed:', e);
    } finally {
      set({ templatesLoading: false });
    }
  },

  fetchMyCards: async (walletAddress: string) => {
    set({ cardsLoading: true });
    try {
      // Restore persisted deck for this wallet
      const savedDeck = get()._decks[walletAddress] ?? [];
      if (savedDeck.length > 0) {
        set({ deck: savedDeck });
      }

      // Resolve user id from wallet address
      const { data: user } = await getSupabase()
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (!user) {
        set({ myCards: [], cardsLoading: false });
        return;
      }

      const { data, error } = await getSupabase()
        .from('cards')
        .select('*, card_templates(*)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ myCards: (data as CardWithTemplate[]) ?? [] });
    } catch (e) {
      if (__DEV__) console.warn('[card-store] fetchMyCards failed:', e);
    } finally {
      set({ cardsLoading: false });
    }
  },

  fetchActiveListings: async () => {
    set({ listingsLoading: true });
    try {
      const { data, error } = await getSupabase()
        .from('listings')
        .select('*, cards(*, card_templates(*))')
        .eq('status', 'ACTIVE')
        .order('listed_at', { ascending: false });

      if (error) throw error;
      set({ activeListings: (data as ListingWithCard[]) ?? [] });
    } catch (e) {
      if (__DEV__) console.warn('[card-store] fetchActiveListings failed:', e);
    } finally {
      set({ listingsLoading: false });
    }
  },

  openPack: async (walletAddress: string, token: string) => {
    set({ mintingPack: true });
    try {
      // Call edge function directly with custom JWT — supabase.functions.invoke
      // doesn't reliably pass custom Authorization headers in all versions.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mint-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `mint-pack failed (${res.status})`);
      }

      const { cards: newCards } = (await res.json()) as { cards: CardWithTemplate[] };
      if (newCards?.length) {
        set((state) => ({ myCards: [...newCards, ...state.myCards] }));
      }
      return newCards ?? null;
    } catch (e) {
      if (__DEV__) console.warn('[card-store] openPack failed:', e);
      return null;
    } finally {
      set({ mintingPack: false });
    }
  },

  listCard: async (cardId: string, sellerWallet: string, priceSol: number) => {
    try {
      const { data: user } = await getSupabase()
        .from('users')
        .select('id')
        .eq('wallet_address', sellerWallet)
        .single();

      if (!user) return false;

      const { error } = await getSupabase().from('listings').insert({
        card_id: cardId,
        seller_id: user.id,
        price_sol: priceSol,
      });

      if (error) throw error;
      get().fetchActiveListings();
      return true;
    } catch (e) {
      if (__DEV__) console.warn('[card-store] listCard failed:', e);
      return false;
    }
  },

  cancelListing: async (listingId: string) => {
    try {
      const { error } = await getSupabase()
        .from('listings')
        .update({ status: 'CANCELLED' as const })
        .eq('id', listingId);

      if (error) throw error;

      set((state) => ({
        activeListings: state.activeListings.filter((l) => l.id !== listingId),
      }));
      return true;
    } catch (e) {
      if (__DEV__) console.warn('[card-store] cancelListing failed:', e);
      return false;
    }
  },
}),
  {
    name: 'card-store',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ _decks: state._decks }),
  },
));
