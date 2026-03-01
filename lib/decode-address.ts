import { PublicKey } from '@solana/web3.js';

/** Convert base64 or base64url encoded address bytes → PublicKey. */
export function decodeAddress(address: string): PublicKey {
  try {
    // base58 public keys are always 32–44 chars, no `=` padding, no `+` or `/`
    if (!/[+/=\-_]/.test(address) && address.length <= 44) {
      return new PublicKey(address);
    }
    // Normalize base64url → standard base64, then decode
    const b64 = address
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(address.length + ((4 - (address.length % 4)) % 4), '=');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new PublicKey(bytes);
  } catch (e) {
    throw new Error(`Failed to decode wallet address: "${address}"`);
  }
}
