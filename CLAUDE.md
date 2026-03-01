# CLAUDE.md

## Project
Solana Mobile TCG dApp — Android only, Expo bare workflow, Devnet. MWA wallet connect, pNFT cards, marketplace. No backend — Supabase Edge Functions only.

## Commands
```bash
npm start                    # Expo dev server
npm run android              # Android dev client
npm run lint                 # Lint
npx expo prebuild --platform android  # Native project (required for MWA)
supabase functions deploy --all       # Deploy edge functions
supabase functions serve              # Local edge functions
supabase db push                      # Push migrations
```

## Structure
```
app/                    Expo Router v6. Groups: (auth)/, (tabs)/
supabase/functions/     Edge Functions (Deno) — auth-challenge, auth-verify, mint-pack, marketplace-buy
supabase/migrations/    SQL + RLS
constants/theme.ts      Design tokens — ALL colors/spacing/fonts here
stores/                 Zustand v5 stores (wallet-store, card-store, auth-store)
lib/solana.ts           Singleton Connection, APP_IDENTITY
lib/supabase.ts         Typed Supabase client + AsyncStorage session adapter
hooks/useWallet.ts      MWA hook (connect, disconnect, getBalance, sendSOL)
types/database.ts       Supabase Row/Insert/Update types
```

## Stack
Zustand v5 (no TanStack Query) · MWA (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`) · Metaplex UMI (Phase 2) · AsyncStorage · FlatList (no FlashList) · Plus Jakarta Sans 400–800 · Dark theme (`#CCFF00` lime, `#FF4D00` orange) · `react-native-svg` · New Architecture enabled · Path alias `@/` → root

## Critical Rules
1. **Polyfills first** — `polyfills.ts` MUST be first import in `index.js`
2. **MWA import** — `try/catch require()` at module level, NOT `import` or `await import()`. Check `if (!transact)` before calling
3. **BigInt** — breaks `JSON.stringify`, convert to string first
4. **Tx confirm** — `commitment: "confirmed"` + retry with exponential backoff
5. **No CSS shorthands** — use `backgroundColor` not `background`
6. **Theme tokens only** — no hardcoded colors/spacing
7. **No unnecessary animations** — simple and functional
8. **Edge functions use Deno** — `Deno.serve()`, URL imports (`https://esm.sh/...`), `@ts-nocheck` for IDE

## Auth Flow
App open → AsyncStorage session check → valid: `(tabs)/` | invalid: `(auth)/connect` → MWA authorize → `auth-challenge` → sign nonce → `auth-verify` → JWT session → `(tabs)/`

## DB Tables
`users`, `card_templates`, `cards`, `listings`, `nonces`, `battles`, `battle_moves` — RLS enabled, `price_sol` is `numeric(12,9)` (returned as string)

## Env
Client `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DEVNET_RPC_URL` — all set.
Edge functions get `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` automatically from Supabase.

## Current Session Context

### Navigation
`Stack → Drawer → Tabs(6)`. Drawer has devnet/mainnet toggle. Tabs: Home, Friends, Inv, **BATTLE** (center lime), Rank, Shop. Battle tab hides shared Header. Friends/Inv/Rank/Shop are "Coming soon" placeholders.

### What's Working
- **Wallet connect/disconnect** via Header.tsx using MWA `transact()` → `wallet.authorize()`. Stores `connectedPublicKey` + `authToken` in `wallet-store` (persisted to AsyncStorage as `cybercard-wallet-session`).
- **SOL balance** fetches on connect, refreshes every 30s silently. Shows in header pill with Solana SVG logo.
- **Home screen** renders HeroCard, StatsGrid, RosterSection — all **hardcoded data**, not connected to stores/Supabase.
- **Battle screen** is UI-only radar matchmaking with animated circles + timer. Hardcoded fighter card.
- **Drawer** cluster toggle works — disconnects wallet + resets RPC connection on switch.
- **Supabase client** (`lib/supabase.ts`) is configured with typed `Database` generic + AsyncStorage adapter.
- **Edge functions** all deployed: auth-challenge, auth-verify, mint-pack, marketplace-buy.
- **DB schema** pushed: 7 tables, 3 migrations, 3 seed card templates, RLS policies, atomic purchase function.

### What's NOT Wired
- **Auth flow is disconnected** — `auth-store.authenticate()` has full challenge→sign→verify logic but **nothing calls it**. No `(auth)/` route group exists. No route guard. Users can browse everything unauthenticated.
- **`useWallet.ts` hook** (has connect, disconnect, sendSOL, getBalance with proper error handling) is **not imported by any screen**. Header.tsx has its own inline MWA logic instead.
- **card-store** (fetchTemplates, fetchMyCards, openPack, listCard, cancelListing) is fully implemented but **no UI calls any action**.
- **Home screen** doesn't read from `card-store` or `wallet-store` for energy/streak/roster data.

### Key Implementation Details
- MWA import pattern: `try/catch require()` at module level in Header.tsx. `useWallet.ts` uses static import (crashes in Expo Go).
- Phantom returns base64-encoded addresses → `decodeAddress()` converts to base58 PublicKey.
- `wallet-store.fetchBalance()` shows loading spinner only on first fetch (`solBalance === null`), not on 30s refreshes.
- `auth-verify` signs JWT with `jose` (HS256, 7d expiry). Claims: `{ sub: userId, wallet_address, role: 'authenticated', aud: 'authenticated' }`.
- `mint-pack` rolls 3 cards per pack, costs 10 energy, weighted rarity (COMMON 80%, EPIC 16%, LEGENDARY 4%), serial retry for race safety.
- `marketplace-buy` uses `execute_marketplace_purchase` Postgres function for atomic listing update + card transfer.
- Cards are **DB records only** — NFT fields (`mint_address`, `metadata_uri`, `tx_signature`) are all NULL until Phase 2.
- `price_sol` is `numeric(12,9)` → returned as **string** by supabase-js, typed as `string` in `database.ts`.
- 3 card assets exist: `assets/cards/f1.png`, `f2.png`, `f3.png` — referenced in DB seed but not rendered in any component.

### Stores Snapshot
- **wallet-store** (persisted): `connectedPublicKey`, `authToken`, `cluster`, `solBalance`, `balanceLoading`
- **auth-store** (persisted): `userId`, `sessionToken`, `authLoading` — all null (never populated)
- **card-store** (not persisted): `templates[]`, `myCards[]`, `activeListings[]`, `mintingPack` — all empty (never fetched)

### Known Issues
1. Two wallet implementations (Header inline + useWallet hook) — should consolidate
2. Header disconnect doesn't call `wallet.deauthorize()` (Phantom session lingers)
3. JWT has no refresh logic — fails silently after 7 days
4. `HeroCard.tsx:100` uses hardcoded `#ccc` color instead of theme token
5. `app.json` still has default `"name": "project"`, `"package": "com.anonymous.project"`
6. `npx expo prebuild` not yet run — required for on-device testing

### Detailed Docs
See `current.md` for full developer documentation (DB schema, edge function specs, RLS table, design tokens, etc.)

## Not Yet Built
- Auth screen `(auth)/connect.tsx` + route guard (unified MWA + Supabase auth in one `transact()`)
- Wire Home screen to stores (energy, streak, roster from Supabase)
- Inventory / Shop / Card detail screens
- NFT minting + IPFS metadata (Phase 2 — Metaplex UMI)
- Battle gameplay + battle edge functions (create, join, move, resolve)
- Friends / Rankings systems
- JWT refresh logic
- `eas.json` config / `npx expo prebuild` not yet run
