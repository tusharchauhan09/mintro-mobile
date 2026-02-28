// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
// supabase/functions/auth-verify/index.ts
// Verifies a wallet-signed nonce and returns a session.
// POST { wallet_address, signature, nonce } → { user, token }

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import bs58 from 'https://esm.sh/bs58@5.0.0';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { wallet_address, signature, nonce } = await req.json();

    if (!wallet_address || !signature || !nonce) {
      return new Response(
        JSON.stringify({ error: 'wallet_address, signature, and nonce are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Look up the nonce — must exist, be unused, and not expired
    const { data: nonceRow, error: nonceError } = await supabaseAdmin
      .from('nonces')
      .select('*')
      .eq('nonce', nonce)
      .eq('wallet_address', wallet_address)
      .eq('used', false)
      .single();

    if (nonceError || !nonceRow) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired nonce' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (new Date(nonceRow.expires_at) < new Date()) {
      // Mark as used even though expired
      await supabaseAdmin.from('nonces').update({ used: true }).eq('id', nonceRow.id);
      return new Response(
        JSON.stringify({ error: 'Nonce has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Verify the Ed25519 signature
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const publicKeyBytes = bs58.decode(wallet_address);

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Mark nonce as used
    await supabaseAdmin.from('nonces').update({ used: true }).eq('id', nonceRow.id);

    // 4. Upsert user — create if first time, update last login otherwise
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

    // 5. Generate a Supabase custom JWT for this user
    // This uses the Supabase admin API to create a session
    // The user's UUID becomes the auth.uid() for RLS policies
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    if (!jwtSecret) throw new Error('SUPABASE_JWT_SECRET not configured');

    // Import jose for JWT signing
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
    console.error('[auth-verify]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
