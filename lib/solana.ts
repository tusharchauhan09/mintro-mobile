import { Connection, clusterApiUrl, type Cluster } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Config — all values come from process.env (EXPO_PUBLIC_ prefix required by
// Metro so they are inlined at build time and available in client bundles).
// ---------------------------------------------------------------------------
const RAW_CLUSTER = process.env.EXPO_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
const VALID_CLUSTERS: ReadonlyArray<Cluster> = ['devnet', 'testnet', 'mainnet-beta'];

if (!VALID_CLUSTERS.includes(RAW_CLUSTER as Cluster)) {
  throw new Error(
    `[solana] EXPO_PUBLIC_SOLANA_CLUSTER must be one of ${VALID_CLUSTERS.join(', ')}. Got: "${RAW_CLUSTER}"`,
  );
}

export const SOLANA_CLUSTER = RAW_CLUSTER as Cluster;
export const IS_DEVNET = SOLANA_CLUSTER === 'devnet';

const RPC_URL =
  process.env.EXPO_PUBLIC_RPC_URL?.trim() || clusterApiUrl(SOLANA_CLUSTER);

// ---------------------------------------------------------------------------
// Singleton connection — avoids opening a new WebSocket on every hook render.
// ---------------------------------------------------------------------------
let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, { commitment: 'confirmed' });
  }
  return _connection;
}

// ---------------------------------------------------------------------------
// MWA app identity — shown inside the wallet authorization popup.
// ---------------------------------------------------------------------------
export const APP_IDENTITY = {
  name: process.env.EXPO_PUBLIC_APP_NAME ?? 'CyberCard Arena',
  uri: `${process.env.EXPO_PUBLIC_APP_SCHEME ?? 'project'}://`,
  icon: process.env.EXPO_PUBLIC_APP_ICON ?? 'favicon.ico',
} as const;
