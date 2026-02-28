import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  /** Supabase user ID (uuid) — set after auth-verify succeeds. */
  userId: string | null;
  /** Custom JWT from auth-verify edge function. */
  sessionToken: string | null;
  /** Whether auth flow is in progress. */
  authLoading: boolean;

  // --- actions ---
  setSession: (userId: string, token: string) => void;
  clearAuth: () => void;
  setAuthLoading: (loading: boolean) => void;

  /** Full auth flow: challenge → sign → verify → session. */
  authenticate: (walletAddress: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>) => Promise<void>;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      sessionToken: null,
      authLoading: false,

      setSession: (userId, token) => set({ userId, sessionToken: token }),
      clearAuth: () => set({ userId: null, sessionToken: null }),
      setAuthLoading: (loading) => set({ authLoading: loading }),

      authenticate: async (walletAddress, signMessage) => {
        set({ authLoading: true });
        try {
          // 1. Request nonce from auth-challenge
          const challengeRes = await fetch(`${SUPABASE_URL}/functions/v1/auth-challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: walletAddress }),
          });

          if (!challengeRes.ok) {
            const err = await challengeRes.json();
            throw new Error(err.error ?? 'Failed to get challenge');
          }

          const { nonce } = await challengeRes.json();

          // 2. Sign the nonce with the wallet
          const messageBytes = new TextEncoder().encode(nonce);
          const signatureBytes = await signMessage(messageBytes);
          const signature = btoa(String.fromCharCode(...signatureBytes));

          // 3. Verify signature with auth-verify
          const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/auth-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: walletAddress,
              signature,
              nonce,
            }),
          });

          if (!verifyRes.ok) {
            const err = await verifyRes.json();
            throw new Error(err.error ?? 'Failed to verify signature');
          }

          const { user, token } = await verifyRes.json();

          set({ userId: user.id, sessionToken: token, authLoading: false });
        } catch (e) {
          set({ authLoading: false });
          throw e;
        }
      },
    }),
    {
      name: 'cybercard-auth-session',
      partialize: (state) => ({
        userId: state.userId,
        sessionToken: state.sessionToken,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
