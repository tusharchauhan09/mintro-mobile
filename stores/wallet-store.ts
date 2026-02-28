import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletState {
  /** Base58-encoded public key of the connected wallet, or null when disconnected. */
  connectedPublicKey: string | null;
  /**
   * MWA auth token returned from wallet.authorize() / wallet.reauthorize().
   * Persist this so we can call reauthorize() on subsequent sessions
   * without showing the full permission popup again.
   */
  authToken: string | null;
  /** SOL balance in SOL (not lamports). null = not yet fetched. */
  solBalance: number | null;
  /** Whether a balance fetch is in progress. */
  balanceLoading: boolean;

  // --- actions ---
  setConnectedPublicKey: (key: string | null) => void;
  setAuthToken: (token: string | null) => void;
  setSolBalance: (balance: number | null) => void;
  setBalanceLoading: (loading: boolean) => void;
  /** Fetch SOL balance from the RPC endpoint. */
  fetchBalance: () => Promise<void>;
  /** Wipes wallet session from both memory and AsyncStorage. */
  clearSession: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      connectedPublicKey: null,
      authToken: null,
      solBalance: null,
      balanceLoading: false,

      setConnectedPublicKey: (key) => set({ connectedPublicKey: key }),
      setAuthToken: (token) => set({ authToken: token }),
      setSolBalance: (balance) => set({ solBalance: balance }),
      setBalanceLoading: (loading) => set({ balanceLoading: loading }),
      fetchBalance: async () => {
        const pubkey = get().connectedPublicKey;
        if (!pubkey) return;
        set({ balanceLoading: true });
        try {
          const { PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
          const { getConnection } = await import('@/lib/solana');
          const lamports = await getConnection().getBalance(new PublicKey(pubkey));
          set({ solBalance: lamports / LAMPORTS_PER_SOL, balanceLoading: false });
        } catch (e) {
          if (__DEV__) console.warn('[wallet-store] fetchBalance failed:', e);
          set({ balanceLoading: false });
        }
      },
      clearSession: () => set({ connectedPublicKey: null, authToken: null, solBalance: null }),
    }),
    {
      name: 'cybercard-wallet-session',
      // Persist only the serialisable data fields, not the action functions.
      partialize: (state) => ({
        connectedPublicKey: state.connectedPublicKey,
        authToken: state.authToken,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
