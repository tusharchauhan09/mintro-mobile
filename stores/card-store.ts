import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { CardTemplate, CardWithTemplate, Listing } from '@/types/database';

type ListingWithCard = Listing & { cards: CardWithTemplate };

interface CardState {
  // --- data ---
  templates: CardTemplate[];
  myCards: CardWithTemplate[];
  activeListings: ListingWithCard[];

  // --- loading states ---
  templatesLoading: boolean;
  cardsLoading: boolean;
  listingsLoading: boolean;
  mintingPack: boolean;

  // --- actions ---
  fetchTemplates: () => Promise<void>;
  fetchMyCards: (walletAddress: string) => Promise<void>;
  fetchActiveListings: () => Promise<void>;
  openPack: (walletAddress: string, token: string) => Promise<CardWithTemplate[] | null>;
  listCard: (cardId: string, sellerWallet: string, priceSol: number) => Promise<boolean>;
  cancelListing: (listingId: string) => Promise<boolean>;
}

export const useCardStore = create<CardState>()((set, get) => ({
  templates: [],
  myCards: [],
  activeListings: [],
  templatesLoading: false,
  cardsLoading: false,
  listingsLoading: false,
  mintingPack: false,

  fetchTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const { data, error } = await supabase
        .from('card_templates')
        .select('*')
        .order('rarity');

      if (error) throw error;
      set({ templates: data ?? [] });
    } catch (e) {
      if (__DEV__) console.warn('[card-store] fetchTemplates failed:', e);
    } finally {
      set({ templatesLoading: false });
    }
  },

  fetchMyCards: async (walletAddress: string) => {
    set({ cardsLoading: true });
    try {
      // Resolve user id from wallet address
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (!user) {
        set({ myCards: [], cardsLoading: false });
        return;
      }

      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase.functions.invoke('mint-pack', {
        body: { wallet_address: walletAddress },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const newCards = data?.cards as CardWithTemplate[] | undefined;
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
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', sellerWallet)
        .single();

      if (!user) return false;

      const { error } = await supabase.from('listings').insert({
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
      const { error } = await supabase
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
}));
