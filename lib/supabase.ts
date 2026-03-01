import { createClient } from '@supabase/supabase-js';
import { asyncStorageAdapter } from '@/lib/storage';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — Supabase calls will fail.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: asyncStorageAdapter,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false, // no browser URL in RN
  },
});

/**
 * Set a custom JWT on the Supabase client so that RLS policies
 * using auth.uid() resolve to our custom token's `sub` claim.
 * Call this after successful auth-verify or session restore.
 *
 * Uses supabase.functions.setAuth() for edge function calls, and
 * manually sets the session for PostgREST (data) calls.
 */
export async function setSupabaseAccessToken(token: string | null) {
  if (token) {
    // Set a fake session so PostgREST requests include our custom JWT
    // in the Authorization header, making auth.uid() resolve correctly.
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  } else {
    await supabase.auth.signOut();
  }
}
