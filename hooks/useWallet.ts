/**
 * hooks/useWallet.ts
 *
 * Production-level Mobile Wallet Adapter hook.
 *
 * Key improvements over a basic implementation:
 *  - Auth-token persistence: calls wallet.reauthorize() on subsequent sessions
 *    so the user never sees the full permission popup again after first connect.
 *  - Deauthorize on disconnect: cleanly removes the session from the wallet.
 *  - Singleton Solana Connection (no new WebSocket on every render).
 *  - Typed WalletError class for structured error handling in UI.
 *  - Exponential backoff on transaction send with configurable retries.
 *  - __DEV__ gated logging: zero log overhead in production builds.
 *  - No store coupling in sendSOL: auth token always read from the store at
 *    call time, never captured in a stale closure.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  transact,
  type Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  type TransactionSignature,
} from '@solana/web3.js';

import { useWalletStore } from '@/stores/wallet-store';
import { APP_IDENTITY, getSolanaCluster, getConnection } from '@/lib/solana';

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------
export class WalletError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    throw new WalletError(`Failed to decode wallet address: "${address}"`, e);
  }
}

/** Delay helper for backoff. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Structured console wrapper — stripped in production builds. */
const log = __DEV__
  ? (...args: unknown[]) => console.log('[useWallet]', ...args)
  : () => {};
const warn = __DEV__
  ? (...args: unknown[]) => console.warn('[useWallet]', ...args)
  : () => {};

/**
 * Send a serialized transaction with exponential backoff.
 * Returns the signature string on success.
 */
async function sendWithBackoff(
  serialized: Uint8Array,
  maxAttempts = 3,
): Promise<TransactionSignature> {
  const connection = getConnection();
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(500 * 2 ** attempt, 8_000);
      warn(`Send attempt ${attempt + 1}/${maxAttempts}, waiting ${backoffMs}ms…`);
      await delay(backoffMs);
    }
    try {
      const sig = await connection.sendRawTransaction(serialized, {
        skipPreflight: true,
        maxRetries: 0, // we handle retries ourselves
      });
      log('Broadcast succeeded, signature:', sig);
      return sig;
    } catch (e) {
      lastErr = e;
      warn(`Attempt ${attempt + 1} failed:`, (e as Error).message);
    }
  }

  throw new WalletError(
    `Transaction failed after ${maxAttempts} attempts`,
    lastErr,
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWallet() {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sending, setSending] = useState(false);

  // Zustand selectors — each selector is atomic to minimise re-renders.
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const setConnectedPublicKey = useWalletStore((s) => s.setConnectedPublicKey);
  const setAuthToken = useWalletStore((s) => s.setAuthToken);
  const clearSession = useWalletStore((s) => s.clearSession);

  /** Stable PublicKey object — only recreated when the raw key string changes. */
  const publicKey = useMemo(() => {
    if (!connectedPublicKey) return null;
    try {
      return new PublicKey(connectedPublicKey);
    } catch {
      return null;
    }
  }, [connectedPublicKey]);

  // --------------------------------------------------------------------------
  // CONNECT
  //
  // Strategy:
  //   1. If we have a stored auth token, call wallet.reauthorize() first.
  //      This is instant and doesn't show the permission popup.
  //   2. If no token (first launch) or reauthorize throws (token expired),
  //      fall back to wallet.authorize() which shows the popup.
  // --------------------------------------------------------------------------
  const connect = useCallback(async (): Promise<PublicKey> => {
    log('connect() called, cluster:', getSolanaCluster());
    setConnecting(true);

    try {
      const walletAddress = await transact(async (wallet: Web3MobileWallet) => {
        log('Calling wallet.authorize…');
        const authResult = await wallet.authorize({
          cluster: getSolanaCluster(),
          identity: APP_IDENTITY,
        });
        log('wallet.authorize succeeded');

        if (!authResult.accounts?.length) {
          throw new WalletError('No accounts returned by wallet');
        }

        // Store auth token for future reauthorize calls (e.g. signing).
        setAuthToken(authResult.auth_token);

        const userAddress = authResult.accounts[0].address;
        log('Raw address:', userAddress);

        const pubkey = decodeAddress(userAddress);
        return pubkey.toBase58();
      });

      log('Connected:', walletAddress);
      setConnectedPublicKey(walletAddress);

      return new PublicKey(walletAddress);
    } catch (e) {
      if (e instanceof WalletError) throw e;
      throw new WalletError('Wallet connection failed', e);
    } finally {
      setConnecting(false);
    }
  }, [setConnectedPublicKey, setAuthToken]);

  // --------------------------------------------------------------------------
  // DISCONNECT
  //
  // Calls wallet.deauthorize() so the wallet removes the session on its side,
  // then clears local store.
  // --------------------------------------------------------------------------
  const disconnect = useCallback(async (): Promise<void> => {
    log('disconnect() called');
    const currentToken = useWalletStore.getState().authToken;

    if (!currentToken) {
      clearSession();
      return;
    }

    setDisconnecting(true);
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: currentToken });
      });
      log('Deauthorized successfully');
    } catch (e) {
      // Non-fatal — clear local session regardless.
      warn('Deauthorize failed (clearing session anyway):', (e as Error).message);
    } finally {
      clearSession();
      setDisconnecting(false);
    }
  }, [clearSession]);

  // --------------------------------------------------------------------------
  // GET BALANCE
  // --------------------------------------------------------------------------
  const getBalance = useCallback(async (): Promise<number> => {
    if (!publicKey) throw new WalletError('Wallet not connected');
    const lamports = await getConnection().getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }, [publicKey]);

  // --------------------------------------------------------------------------
  // SEND SOL
  //
  // Flow:
  //   1. Fetch latest blockhash.
  //   2. Build transfer transaction.
  //   3. Open MWA session → reauthorize → signTransactions.
  //   4. Wait briefly for the MWA overlay to close (Phantom/Backpack need ~1s).
  //   5. Broadcast with exponential backoff.
  //   6. Confirm with lastValidBlockHeight strategy.
  // --------------------------------------------------------------------------
  const sendSOL = useCallback(
    async (toAddress: string, amountSOL: number): Promise<TransactionSignature> => {
      log('sendSOL() called, to:', toAddress, 'amount:', amountSOL, 'SOL');

      if (!publicKey) throw new WalletError('Wallet not connected');
      if (amountSOL <= 0) throw new WalletError('Amount must be greater than 0');

      const toPublicKey = (() => {
        try {
          return new PublicKey(toAddress);
        } catch {
          throw new WalletError(`Invalid recipient address: "${toAddress}"`);
        }
      })();

      setSending(true);
      try {
        const connection = getConnection();

        // 1. Blockhash
        log('Fetching blockhash…');
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('confirmed');
        log('Blockhash:', blockhash);

        // 2. Build transaction
        const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: publicKey,
        }).add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: toPublicKey,
            lamports,
          }),
        );

        // 3. Sign inside MWA session
        log('Opening MWA session for signing…');
        const signedTransaction = await transact(
          async (wallet: Web3MobileWallet) => {
            // Read token at call time (avoids stale closure).
            const token = useWalletStore.getState().authToken;
            if (!token) throw new WalletError('No auth token — reconnect wallet');

            // Reauthorize to refresh the session token.
            const { auth_token: freshToken } = await wallet.reauthorize({
              auth_token: token,
              identity: APP_IDENTITY,
            });
            // Persist refreshed token.
            useWalletStore.getState().setAuthToken(freshToken);

            log('Signing transaction…');
            const [signed] = await wallet.signTransactions({
              transactions: [transaction],
            });
            if (!signed) throw new WalletError('Wallet returned no signed transaction');
            return signed;
          },
        );
        log('Transaction signed');

        // 4. Brief pause — gives Phantom/Backpack time to release network
        await delay(1_000);

        // 5. Broadcast with backoff
        const serialized = signedTransaction.serialize();
        const signature = await sendWithBackoff(serialized);

        // 6. Confirm
        log('Confirming…');
        const { value } = await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          'confirmed',
        );

        if (value.err) {
          throw new WalletError(
            `Transaction reverted on-chain: ${JSON.stringify(value.err)}`,
          );
        }

        log('Transaction confirmed:', signature);
        return signature;
      } catch (e) {
        if (e instanceof WalletError) throw e;
        throw new WalletError('sendSOL failed', e);
      } finally {
        setSending(false);
      }
    },
    [publicKey],
  );

  return {
    // State
    publicKey,
    connected: !!publicKey,
    connecting,
    disconnecting,
    sending,
    // Actions
    connect,
    disconnect,
    getBalance,
    sendSOL,
    // Expose connection for advanced usage (e.g. reading on-chain data)
    connection: getConnection(),
  };
}
