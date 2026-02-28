// @ts-nocheck -- Deno edge function; use Deno extension for IDE support
import { jwtVerify } from 'https://esm.sh/jose@5.2.0';

interface JwtPayload {
  sub: string; // user id
  wallet_address: string;
  role: string;
}

/**
 * Verifies and decodes the Bearer JWT from the Authorization header.
 * Returns the payload or null if invalid/missing.
 */
export async function verifyJwt(req: Request): Promise<JwtPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const secret = Deno.env.get('SUPABASE_JWT_SECRET');
  if (!secret) {
    console.error('[verify-jwt] SUPABASE_JWT_SECRET not set');
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (!payload.sub || !payload.wallet_address) return null;
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
