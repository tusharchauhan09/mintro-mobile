// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
// supabase/functions/auth-upsert/index.ts
// Upserts a user by wallet address and returns a session JWT.
// MWA authorize already proves wallet ownership — no nonce signing needed.
// POST { wallet_address: string } → { user, token }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req: Request) => {
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

    // Basic validation: Solana base58 addresses are 32-44 chars
    if (wallet_address.length < 32 || wallet_address.length > 44) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Upsert user — create if first time, update last login otherwise
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        { wallet_address, updated_at: new Date().toISOString() },
        { onConflict: 'wallet_address' },
      )
      .select()
      .single();

    if (userError || !user) {
      throw userError ?? new Error('Failed to upsert user');
    }

    // Generate a custom JWT for this user
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    if (!jwtSecret) throw new Error('SUPABASE_JWT_SECRET not configured');

    const { SignJWT } = await import('https://esm.sh/jose@5.2.0');
    const secret = new TextEncoder().encode(jwtSecret);

    const token = await new SignJWT({
      sub: user.id,
      wallet_address: user.wallet_address,
      role: 'authenticated',
      aud: 'authenticated',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return new Response(
      JSON.stringify({ user, token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[auth-upsert]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
