// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase admin client using service_role key.
 * Use ONLY inside edge functions — never expose this key to the client.
 */
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
