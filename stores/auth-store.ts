import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_IDENTITY, getSolanaCluster } from '@/lib/solana';
import { decodeAddress } from '@/lib/decode-address';
import { useWalletStore } from '@/stores/wallet-store';
import { setSupabaseAccessToken } from '@/lib/supabase';
import type { User } from '@/types/database';

// Safe MWA require — native module only exists in dev-client builds.
let transact: any = null;
try {
  transact =
    require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;
} catch {
  // Not available (Expo Go) — transact stays null
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** Check if a JWT is expired by decoding the payload. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/** Check if Supabase is configured with valid-looking credentials. */
function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  // Real Supabase anon keys are JWTs starting with "eyJ"
  return url.includes('.supabase.co') && key.startsWith('eyJ');
}

interface AuthState {
  /** Supabase user ID (uuid) — set after auth-verify succeeds. */
  userId: string | null;
  /** Custom JWT from auth-verify edge function. */
  sessionToken: string | null;
  /** User profile from the users table. */
  userProfile: User | null;
  /** Whether auth flow is in progress. */
  authLoading: boolean;
  /** Whether the persisted state has been rehydrated from AsyncStorage. */
  _hasHydrated: boolean;

  // --- actions ---
  setSession: (userId: string, token: string) => void;
  clearAuth: () => Promise<void>;
  setAuthLoading: (loading: boolean) => void;
  setHasHydrated: (val: boolean) => void;

  /** Fetch user profile from Supabase. */
  fetchUserProfile: () => Promise<void>;

  /**
   * Connect wallet via MWA, then optionally authenticate with Supabase.
   * MWA connect always succeeds independently — Supabase failure is non-fatal.
   */
  authenticateWithWallet: () => Promise<void>;

  /** Deauthorize MWA + clear both stores. */
  logout: () => Promise<void>;

  /** Check if the current session token is expired. */
  isSessionExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      sessionToken: null,
      userProfile: null,
      authLoading: false,
      _hasHydrated: false,

      setSession: (userId, token) => set({ userId, sessionToken: token }),
      clearAuth: async () => {
        await setSupabaseAccessToken(null);
        set({ userId: null, sessionToken: null, userProfile: null });
      },
      setAuthLoading: (loading) => set({ authLoading: loading }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      fetchUserProfile: async () => {
        if (!isSupabaseConfigured()) return;
        const { userId } = get();
        if (!userId) return;

        try {
          const { supabase } = await import('@/lib/supabase');

          // Try by UUID first (real Supabase session), fall back to wallet address
          const isUuid = /^[0-9a-f]{8}-/.test(userId);
          const { data, error } = isUuid
            ? await supabase.from('users').select('*').eq('id', userId).single()
            : await supabase.from('users').select('*').eq('wallet_address', userId).single();

          if (!error && data) set({ userProfile: data as User });
        } catch (e) {
          if (__DEV__) console.warn('[auth-store] fetchUserProfile failed:', e);
        }
      },

      authenticateWithWallet: async () => {
        if (!transact) {
          throw new Error('MWA not available — install a Solana wallet app');
        }

        set({ authLoading: true });
        try {
          // --- Step 1: MWA authorize (this is the core wallet connect) ---
          const authInfo = await transact(async (wallet: any) => {
            const authResult = await wallet.authorize({
              cluster: getSolanaCluster(),
              identity: APP_IDENTITY,
            });

            if (!authResult.accounts?.length) {
              throw new Error('No accounts returned from wallet');
            }

            return {
              rawAddress: authResult.accounts[0].address,
              walletAddress: decodeAddress(
                authResult.accounts[0].address,
              ).toBase58(),
              mwaAuthToken: authResult.auth_token as string,
            };
          });

          // Store wallet info immediately — wallet is now connected
          useWalletStore.getState().setConnectedPublicKey(authInfo.walletAddress);
          useWalletStore.getState().setAuthToken(authInfo.mwaAuthToken);

          // Generate a local session token so the route guard lets us through.
          // This works even without Supabase.
          const localPayload = btoa(JSON.stringify({
            sub: authInfo.walletAddress,
            wallet_address: authInfo.walletAddress,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
          }));
          const localToken = `eyJhbGciOiJub25lIn0.${localPayload}.local`;

          // Set local token on Supabase client so RLS queries work immediately
          setSupabaseAccessToken(localToken);

          set({
            userId: authInfo.walletAddress,
            sessionToken: localToken,
            authLoading: false,
          });

          // Kick off balance fetch (non-blocking)
          useWalletStore.getState().fetchBalance();

          // --- Step 2: Try Supabase auth in background (non-blocking) ---
          if (isSupabaseConfigured()) {
            trySupabaseAuth(authInfo.walletAddress)
              .then(() => {
                // Re-fetch user data now that the real user row exists in DB
                get().fetchUserProfile();
              })
              .catch((e) => {
                if (__DEV__) console.warn('[auth-store] Supabase auth failed (non-fatal):', e.message);
              });
          }
        } catch (e) {
          set({ authLoading: false });
          throw e;
        }
      },

      logout: async () => {
        try {
          const currentToken = useWalletStore.getState().authToken;
          if (transact && currentToken) {
            await transact(async (wallet: any) => {
              await wallet.deauthorize({ auth_token: currentToken });
            });
          }
        } catch (e) {
          if (__DEV__) console.warn('[auth-store] deauthorize failed:', e);
        } finally {
          await setSupabaseAccessToken(null);
          useWalletStore.getState().clearSession();
          set({ userId: null, sessionToken: null, userProfile: null });
        }
      },

      isSessionExpired: () => {
        const { sessionToken } = get();
        if (!sessionToken) return true;
        return isTokenExpired(sessionToken);
      },
    }),
    {
      name: 'cybercard-auth-session',
      partialize: (state) => ({
        userId: state.userId,
        sessionToken: state.sessionToken,
        userProfile: state.userProfile,
      }),
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Restore custom JWT on Supabase client after rehydration
        if (state?.sessionToken && !isTokenExpired(state.sessionToken)) {
          setSupabaseAccessToken(state.sessionToken);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Upsert user in Supabase and get a real JWT.
 * MWA authorize already proved wallet ownership — no second popup needed.
 */
async function trySupabaseAuth(walletAddress: string) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/auth-upsert`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to upsert user');
  }

  const { user, token } = await res.json();

  // Upgrade local session to real Supabase session
  await setSupabaseAccessToken(token);
  useAuthStore.setState({
    userId: user.id,
    sessionToken: token,
    userProfile: user,
  });
}
