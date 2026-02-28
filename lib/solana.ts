import { Connection, clusterApiUrl } from '@solana/web3.js';
import type { SolanaCluster } from '@/stores/wallet-store';

// ---------------------------------------------------------------------------
// RPC URLs — read from env at build time (EXPO_PUBLIC_ prefix required by Metro).
// ---------------------------------------------------------------------------
const DEVNET_RPC_URL =
  process.env.EXPO_PUBLIC_DEVNET_RPC_URL?.trim() || clusterApiUrl('devnet');

const MAINNET_RPC_URL =
  process.env.EXPO_PUBLIC_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');

/** Returns the RPC endpoint URL for the given cluster. */
export function getRpcUrl(cluster: SolanaCluster): string {
  return cluster === 'mainnet-beta' ? MAINNET_RPC_URL : DEVNET_RPC_URL;
}

// ---------------------------------------------------------------------------
// Singleton connection — lazily created. resetConnection() forces a new one
// on the next call (e.g. after cluster switch).
// ---------------------------------------------------------------------------
let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    // Import inline to avoid circular dependency at module init time.
    const { useWalletStore } = require('@/stores/wallet-store');
    const cluster: SolanaCluster = useWalletStore.getState().cluster;
    _connection = new Connection(getRpcUrl(cluster), { commitment: 'confirmed' });
  }
  return _connection;
}

/** Drop the cached connection so the next getConnection() creates a fresh one. */
export function resetConnection(): void {
  _connection = null;
}

/** Helper — returns the cluster label suitable for MWA authorize(). */
export function getSolanaCluster(): SolanaCluster {
  const { useWalletStore } = require('@/stores/wallet-store');
  return useWalletStore.getState().cluster;
}

// ---------------------------------------------------------------------------
// MWA app identity — shown inside the wallet authorization popup.
// ---------------------------------------------------------------------------
export const APP_IDENTITY = {
  name: process.env.EXPO_PUBLIC_APP_NAME ?? 'CyberCard Arena',
  uri: `${process.env.EXPO_PUBLIC_APP_URI ?? 'https://cybercard.arena'}`,
  icon: process.env.EXPO_PUBLIC_APP_ICON ?? 'favicon.ico',
} as const;
