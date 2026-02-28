// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
// supabase/functions/auth-challenge/index.ts
// Generates a random nonce for wallet signature authentication.
// POST { wallet_address: string } → { nonce: string }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

const NONCE_TTL_MINUTES = 5;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { wallet_address } = await req.json();

    if (!wallet_address || typeof wallet_address !== 'string') {
      return new Response(
        JSON.stringify({ error: 'wallet_address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate a cryptographically random nonce
    const nonceBytes = new Uint8Array(32);
    crypto.getRandomValues(nonceBytes);
    const nonce = Array.from(nonceBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Invalidate any existing unused nonces for this wallet
    await supabaseAdmin
      .from('nonces')
      .update({ used: true })
      .eq('wallet_address', wallet_address)
      .eq('used', false);

    // Insert the new nonce
    const expiresAt = new Date(Date.now() + NONCE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('nonces')
      .insert({
        wallet_address,
        nonce,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ nonce }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[auth-challenge]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
