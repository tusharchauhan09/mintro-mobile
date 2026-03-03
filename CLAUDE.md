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
app/                    Expo Router v6. Groups: (auth)/, (drawer)/(tabs)/
app/(auth)/             Auth screens — connect.tsx (MWA wallet connect)
app/(drawer)/(tabs)/    Main app tabs after optional auth
supabase/functions/     Edge Functions (Deno) — auth-challenge, auth-verify, mint-pack, marketplace-buy
supabase/migrations/    SQL + RLS + seed data (5 migrations)
constants/theme.ts      Design tokens — ALL colors/spacing/fonts here
constants/card-utils.ts Shared card utilities (getGradientForRarity, getElementIcon)
constants/preview-cards.ts  Mock card data (15 cards) for inventory preview mode
components/inventory/   CardDetailModal, DragOverlay — inventory UI components
stores/                 Zustand v5 stores (wallet-store, card-store, auth-store)
lib/solana.ts           Singleton Connection, APP_IDENTITY
lib/supabase.ts         Typed Supabase client + AsyncStorage session adapter
lib/decode-address.ts   Shared base64→base58 address decoder (isolated from MWA imports)
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

## Auth Flow (Updated 2026-03-01)
**No route guard** — users land on home screen unauthenticated. Flow:
1. App open → Home screen (unauthenticated browsing OK)
2. User opens Drawer → picks Devnet/Mainnet cluster
3. User taps "Connect Wallet" in Header → `auth-store.authenticateWithWallet()`:
   - MWA `transact()` → `wallet.authorize()` → stores wallet address + MWA auth token
   - Generates local JWT immediately (7d expiry) → sets on Supabase client via `setSupabaseAccessToken()`
   - Background: `trySupabaseAuth()` → `auth-challenge` (nonce) → sign nonce via MWA → `auth-verify` → user upserted in DB → session upgraded to real Supabase JWT
   - After Supabase auth: `fetchUserProfile()` called to load user data
4. Logout: Header disconnect → `auth-store.logout()` → MWA `deauthorize()` → clear both stores

## DB Tables
`users`, `card_templates`, `cards`, `listings`, `nonces`, `battles`, `battle_moves` — RLS enabled, `price_sol` is `numeric(12,9)` (returned as string)

## Env
Client `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DEVNET_RPC_URL` — all set.
Edge functions get `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` automatically from Supabase.

## Current State (Updated 2026-03-03)

### Navigation
`Stack → Drawer → Tabs(6)`. Drawer has devnet/mainnet toggle. Tabs: Home, Friends, Inv, **BATTLE** (center lime), Rank, Shop. Battle tab hides shared Header. Friends/Rank/Shop are "Coming soon" placeholders.

### What's Working
- **Auth flow fully wired** — Header.tsx → `auth-store.authenticateWithWallet()` → MWA authorize → local JWT → background Supabase auth (challenge → sign nonce → verify → user upserted in DB → session upgraded)
- **`auth-store.ts`** handles full lifecycle: connect, local JWT, Supabase auth, profile fetch, logout with `deauthorize()`
- **`lib/decode-address.ts`** — shared utility for base64→base58 address decoding (isolated from MWA imports to prevent crash)
- **`app/(auth)/connect.tsx`** — standalone connect screen (calls `authenticateWithWallet()`)
- **Wallet connect/disconnect** via Header.tsx delegating to `auth-store`. Stores `connectedPublicKey` + `authToken` in `wallet-store`.
- **SOL balance** fetches on connect, refreshes every 30s silently.
- **Home screen** (`app/(drawer)/(tabs)/index.tsx`) fetches templates on mount, fetches user cards + profile on wallet connect.
- **Supabase client** (`lib/supabase.ts`) — typed client, `setSupabaseAccessToken()` injects custom JWT for RLS.
- **Edge functions** all deployed: auth-challenge, auth-verify, mint-pack, marketplace-buy.
- **DB schema** pushed: 7 tables, 5 migrations (schema + 3 seed templates + expanded seed data), RLS policies, atomic purchase function.
- **Expanded seed data** — 15 card templates (6 elements, all rarities), 4 users, 14+ cards, 4 marketplace listings.
- **Battle screen** is UI-only radar matchmaking (hardcoded).
- **Drawer** cluster toggle works — disconnects wallet + resets RPC connection on switch.
- **No route guard** — users land on home screen, connect wallet when ready.
- **Inventory screen fully built** — 2-column card grid, 3-slot battle deck builder, drag-and-drop + card detail modal.
- **Drag-and-drop deck building** — long press (300ms) a card → ghost overlay follows finger → drop on deck slot to place. Uses `react-native-gesture-handler` `Gesture.Pan().activateAfterLongPress()` + `react-native-reanimated` shared values.
- **Card detail modal** — tap any card → full-screen modal with rarity gradient header, element/rarity badges, description, stat bars (ATK/DEF/HP), level/XP, serial number, "Add/Remove from Deck" button.
- **Preview mode** — inventory shows all 15 card templates as mock data when no wallet connected (wallet `8G714eBLWo3evwqH9ma8P6244yP2vHfHiPvjHmcsc5ng`). Shows lime "Preview Mode" banner.

### Key Implementation Details
- MWA import: `try/catch require()` at module level in `auth-store.ts` and `Header.tsx`. `useWallet.ts` has static import (unsafe for Expo Go).
- `decodeAddress()` lives in `lib/decode-address.ts` (NOT in `useWallet.ts`) to avoid MWA import chain crash.
- `authenticateWithWallet()` sets local JWT on Supabase client immediately via `setSupabaseAccessToken(localToken)`, then upgrades to real JWT in background.
- `trySupabaseAuth()` triggers a **second MWA popup** (reauthorize to sign nonce) — expected but could confuse users.
- `clearAuth()` is async and awaits `setSupabaseAccessToken(null)` before clearing state.
- `auth-verify` signs JWT with `jose` (HS256, 7d expiry). Claims: `{ sub: userId, wallet_address, role: 'authenticated', aud: 'authenticated' }`.
- `mint-pack` rolls 3 cards per pack, costs 10 energy, weighted rarity (COMMON 80%, EPIC 16%, LEGENDARY 4%).
- `marketplace-buy` uses `execute_marketplace_purchase` Postgres function for atomic listing update + card transfer.
- Cards are **DB records only** — NFT fields are NULL until Phase 2.
- `price_sol` is `numeric(12,9)` → returned as **string** by supabase-js.
- 3 card image assets: `assets/cards/f1.png`, `f2.png`, `f3.png`.
- **Inventory drag-and-drop**: `Gesture.Race(pan, tap)` in each grid card — tap opens modal, long press (300ms) activates pan drag. Ghost overlay uses Reanimated shared values (`dragX`, `dragY`, `dragScale`, `dragOpacity`). Drop detection via `measureInWindow` on deck slot refs. `scrollEnabled={!isDragging}` prevents FlatList scroll during drag.
- **`setDeckSlot(slotIndex, cardId)`** handles positional placement: removes duplicates, pads to 3 slots, places at target index, strips empties.
- **`getGradientForRarity()`** extracted to `constants/card-utils.ts` — used by inventory, CardDetailModal, DragOverlay. Rarity colors: LEGENDARY gold, EPIC purple, RARE blue, COMMON gray gradient.

### Stores Snapshot
- **wallet-store** (persisted): `connectedPublicKey`, `authToken`, `cluster`, `solBalance`, `balanceLoading`
- **auth-store** (persisted): `userId`, `sessionToken`, `userProfile`, `authLoading`, `_hasHydrated`
- **card-store** (deck persisted): `templates[]`, `myCards[]`, `activeListings[]`, `deck[]` (up to 3 card IDs), `mintingPack`. Actions: `toggleDeckCard`, `setDeckSlot(slotIndex, cardId)`

### Migrations
1. `20260228000000_initial_schema.sql` — 7 tables, 5 ENUMs, RLS, triggers, indexes
2. `20260228000001_seed_card_templates.sql` — 3 starter templates (Little Wyrm, Neptune's Wrath, Valor Knight)
3. `20260228000002_marketplace_rpc_and_fixes.sql` — atomic purchase function, nullable card_used for FORFEIT
4. `20260301000000_seed_user_and_cards.sql` — CyberPlayer user + 3 starter cards
5. `20260301000001_expanded_seed_data.sql` — 12 more templates, 3 users, 11 cards, 4 listings

### Seed Data Summary
**Card Templates (15 total):**
- FIRE: Little Wyrm (COMMON), Ember Fox (RARE), Inferno Titan (LEGENDARY)
- WATER: Frost Sprite (COMMON), Tidal Serpent (EPIC), Neptune's Wrath (LEGENDARY)
- EARTH: Root Weaver (COMMON), Stone Golem (RARE), Valor Knight (EPIC)
- AIR: Zephyr Wisp (COMMON), Storm Falcon (EPIC)
- LIGHTNING: Spark Hound (RARE), Voltaic Drake (LEGENDARY)
- SHADOW: Shade Stalker (EPIC), Void Reaper (LEGENDARY)

**Users (4):** CyberPlayer (devnet wallet), ShadowTrader, CardMaster99, NovaCollector

### Known Issues
1. Second MWA popup from `trySupabaseAuth()` (UX friction — user signs nonce in separate transact session)
2. JWT has no refresh logic — fails silently after 7 days
3. Some hardcoded colors in Header.tsx and connect.tsx (not from theme tokens)
4. `wallet-store` has no hydration flag (brief UI flicker on app resume)
5. Cluster switch doesn't call `wallet.deauthorize()`
6. `app.json` still has default `"name": "project"`, `"package": "com.anonymous.project"`
7. `npx expo prebuild` not yet run — required for on-device testing

### Detailed Docs
See `current.md` for full developer documentation (DB schema, edge function specs, RLS table, design tokens, etc.)

## Not Yet Built
- Wire Home screen fully to stores (energy, streak, roster from Supabase — partially done)
- Shop screen
- NFT minting + IPFS metadata (Phase 2 — Metaplex UMI)
- Battle gameplay + battle edge functions (create, join, move, resolve)
- Friends / Rankings systems
- JWT refresh logic
- `eas.json` config / `npx expo prebuild` not yet run
- Push latest migrations to Supabase (`supabase db push`)
