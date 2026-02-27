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

  // --- actions ---
  setConnectedPublicKey: (key: string | null) => void;
  setAuthToken: (token: string | null) => void;
  /** Wipes wallet session from both memory and AsyncStorage. */
  clearSession: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connectedPublicKey: null,
      authToken: null,

      setConnectedPublicKey: (key) => set({ connectedPublicKey: key }),
      setAuthToken: (token) => set({ authToken: token }),
      clearSession: () => set({ connectedPublicKey: null, authToken: null }),
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
