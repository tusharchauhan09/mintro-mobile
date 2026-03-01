# CyberCard Arena - Current Project State

> Last updated: 2026-03-01
> A Solana Mobile TCG dApp - Android only, Expo bare workflow, Devnet.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [App Entry & Boot Sequence](#app-entry--boot-sequence)
5. [Navigation Architecture](#navigation-architecture)
6. [Screens & UI Components](#screens--ui-components)
7. [State Management](#state-management)
8. [Wallet Integration (MWA)](#wallet-integration-mwa)
9. [Authentication Flow](#authentication-flow)
10. [Supabase Backend](#supabase-backend)
11. [Database Schema](#database-schema)
12. [Edge Functions](#edge-functions)
13. [Card System](#card-system)
14. [Marketplace](#marketplace)
15. [Design System](#design-system)
16. [Environment Variables](#environment-variables)
17. [Known Issues & Gaps](#known-issues--gaps)
18. [What's Not Built Yet](#whats-not-built-yet)

---

## Quick Start

```bash
npm start                    # Expo dev server
npm run android              # Android dev client (requires prebuild)
npm run lint                 # ESLint
npx expo prebuild --platform android  # Generate native project (NOT YET RUN)
supabase functions serve     # Local edge functions
supabase functions deploy --all       # Deploy edge functions
supabase db push             # Push migrations to Supabase
```

**Important:** `npx expo prebuild` has NOT been run yet. The `android/` directory does not exist from prebuild. MWA requires a dev client build (not Expo Go).

---

## Tech Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Expo SDK 54, React Native 0.81.5, New Architecture enabled        |
| Routing          | Expo Router v6 (file-based)                                       |
| State            | Zustand v5 with `persist` middleware + AsyncStorage                |
| Blockchain       | `@solana/web3.js` v1, MWA protocol (`@solana-mobile/*`)           |
| Backend          | Supabase (Postgres + Edge Functions in Deno)                      |
| Font             | Plus Jakarta Sans (400-800 weights via `@expo-google-fonts`)      |
| Animations       | `react-native-reanimated` ~4.1.1 (used only in BottomTabBar)     |
| SVG              | `react-native-svg` 15.12.1                                       |
| Gradients        | `expo-linear-gradient`                                            |
| TypeScript       | ~5.9.2, strict mode, path alias `@/` -> project root             |
| React Compiler   | Enabled (`experiments.reactCompiler: true` in app.json)           |
| Typed Routes     | Enabled (`experiments.typedRoutes: true` in app.json)             |

---

## Project Structure

```
project/
├── index.js                    # Entry point - imports polyfills FIRST, then expo-router
├── polyfills.ts                # Buffer + crypto globals (required for Solana libs)
├── app.json                    # Expo config (newArchEnabled, reactCompiler, typedRoutes)
├── metro.config.js             # Adds .mjs extension, disables package exports resolution
├── tsconfig.json               # strict, @/ path alias
│
├── app/                        # Expo Router file-based routing
│   ├── _layout.tsx             # Root: fonts, splash screen, Stack navigator
│   └── (drawer)/               # Drawer group (hamburger menu)
│       ├── _layout.tsx         # Drawer: network switcher (devnet/mainnet)
│       └── (tabs)/             # Tab group
│           ├── _layout.tsx     # Tabs: 6-tab layout with shared Header
│           ├── index.tsx       # Home screen (HeroCard, StatsGrid, RosterSection)
│           ├── battle.tsx      # Battle matchmaking radar (full-screen, hides header)
│           ├── friends.tsx     # Placeholder - "Coming soon"
│           ├── inventory.tsx   # Placeholder - "Coming soon"
│           ├── rank.tsx        # Placeholder - "Coming soon"
│           └── shop.tsx        # Placeholder - "Coming soon"
│
├── components/
│   ├── home/
│   │   ├── Header.tsx          # App header: hamburger, SOL pill, trophy, wallet connect
│   │   ├── HeroCard.tsx        # Live event banner (hardcoded data)
│   │   ├── StatsGrid.tsx       # Energy + Streak cards (hardcoded data)
│   │   └── RosterSection.tsx   # Card roster list (hardcoded data)
│   └── navigation/
│       └── BottomTabBar.tsx    # Custom 6-tab bar with center BATTLE button
│
├── stores/
│   ├── wallet-store.ts         # Wallet connection, SOL balance, cluster selection
│   ├── auth-store.ts           # Supabase auth: challenge -> sign -> verify -> JWT
│   └── card-store.ts           # Card templates, user cards, listings, pack minting
│
├── hooks/
│   └── useWallet.ts            # MWA hook: connect, disconnect, getBalance, sendSOL
│
├── lib/
│   ├── solana.ts               # Singleton Connection, RPC URLs, APP_IDENTITY
│   ├── supabase.ts             # Typed Supabase client with AsyncStorage adapter
│   └── storage.ts              # AsyncStorage adapter for Supabase auth
│
├── constants/
│   └── theme.ts                # ALL design tokens: colors, spacing, radii, fonts
│
├── types/
│   └── database.ts             # Full Supabase Row/Insert/Update types for all 7 tables
│
├── assets/
│   ├── cards/                  # Card art: f1.png, f2.png, f3.png (local, not IPFS)
│   └── images/                 # App icons, splash screen, favicon
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── cors.ts         # CORS headers (allow all origins)
│   │   │   ├── supabase-admin.ts  # Service-role Supabase client (edge functions only)
│   │   │   └── verify-jwt.ts   # JWT verification helper
│   │   ├── auth-challenge/     # Generates nonce for wallet signature
│   │   ├── auth-verify/        # Verifies Ed25519 sig, upserts user, issues JWT
│   │   ├── mint-pack/          # Opens card pack (3 cards, weighted rarity, energy cost)
│   │   └── marketplace-buy/    # Atomic card purchase
│   └── migrations/
│       ├── 20260228000000_initial_schema.sql       # 7 tables, 5 enums, RLS, triggers
│       ├── 20260228000001_seed_card_templates.sql  # 3 starter cards
│       └── 20260228000002_marketplace_rpc_and_fixes.sql  # Atomic purchase function
```

---

## App Entry & Boot Sequence

1. **`index.js`** loads `./polyfills` first (CRITICAL - Solana libs crash without Buffer/crypto globals)
2. **`polyfills.ts`** patches `global.Buffer` and `globalThis.crypto` using `expo-crypto`
3. **`expo-router/entry`** takes over and starts the router
4. **`app/_layout.tsx`** (RootLayout):
   - Loads Plus Jakarta Sans fonts (5 weights)
   - Has a 5-second safety timeout if fonts fail to load
   - Hides splash screen when ready
   - Renders `<Stack>` with a single `(drawer)` route
5. **`app/(drawer)/_layout.tsx`** renders `<Drawer>` with custom content (network switcher)
6. **`app/(drawer)/(tabs)/_layout.tsx`** renders `<Tabs>` with shared `<Header>` and custom `<BottomTabBar>`

**Metro config** (`metro.config.js`):
- Adds `.mjs` to source extensions (required for Solana ESM modules)
- Disables `unstable_enablePackageExports` to silence Solana dependency warnings

---

## Navigation Architecture

```
Stack (headerShown: false)
  └── Drawer (hamburger, 280px wide, front type)
       │   Custom content: App title + Devnet/Mainnet toggle
       │
       └── Tabs (6 tabs, custom BottomTabBar)
            │   Shared Header (hidden when on battle tab)
            │
            ├── index      → Home (ScrollView with HeroCard, StatsGrid, RosterSection)
            ├── friends    → "Coming soon"
            ├── inventory  → "Coming soon"
            ├── battle     → Full-screen radar matchmaking (own header, no shared Header)
            ├── rank       → "Coming soon"
            └── shop       → "Coming soon"
```

**Tab bar layout:** `[Home] [Friends] [Inventory] [⚡BATTLE⚡] [Rank] [Shop]`
- The BATTLE button is a raised lime circle that floats above the bar
- Tab bar uses `react-native-reanimated` for spring animations on focus/press
- Tab bar is absolutely positioned at the bottom (content needs `paddingBottom: 120`)

**Header visibility:** The `(tabs)/_layout.tsx` tracks the current route name. When `routeName === 'battle'`, the shared Header is hidden. The battle screen renders its own minimal header.

**Drawer:** Accessed via the hamburger icon in the Header. Contains a Devnet/Mainnet cluster toggle. Changing cluster disconnects the wallet, resets balance, and recreates the Solana RPC connection.

---

## Screens & UI Components

### Home Screen (`index.tsx`)
- ScrollView with 3 sections, all using **hardcoded data** (not connected to Supabase)
- **HeroCard**: Gradient card showing a "LIVE EVENT" banner with countdown timer (static "04:22:10")
- **StatsGrid**: Two cards showing Energy (98%) and Streak (12) - hardcoded, not from user DB
- **RosterSection**: Two hardcoded card entries ("Neon Drifter #882", "Cyber Punk #009") with gradient placeholders instead of actual card images

### Battle Screen (`battle.tsx`)
- Full-screen matchmaking radar with animated expanding circles
- Uses `Animated` API (not Reanimated) for the radar pulse effect
- Live timer counting up (MM:SS format)
- Hardcoded fighter card ("Neon Drifter #882, LVL 42, Rare Class, Speed Specialist")
- Stats display (ATK 2,450 / SPD 4,100 / DEF 1,820) - all hardcoded
- "CANCEL SEARCH" button routes back to home via `router.replace('/')`
- No actual matchmaking logic - purely UI

### Header (`Header.tsx`)
- **Left:** Hamburger menu icon (opens drawer)
- **Right group:**
  - SOL balance pill with inline Solana SVG logo + formatted balance
  - Trophy icon with orange notification dot
  - Wallet connect/disconnect button
- Balance auto-refreshes every 30 seconds silently (loading spinner only on first fetch)

### Placeholder Screens
- Friends, Inventory, Rank, Shop all render centered "Coming soon" text

---

## State Management

Three Zustand v5 stores, two with AsyncStorage persistence:

### `wallet-store.ts` (persisted as `cybercard-wallet-session`)

| Field                | Type              | Persisted | Description                         |
| -------------------- | ----------------- | --------- | ----------------------------------- |
| `connectedPublicKey` | `string \| null`  | Yes       | Base58 public key of connected wallet |
| `authToken`          | `string \| null`  | Yes       | MWA auth token for reauthorization  |
| `cluster`            | `SolanaCluster`   | Yes       | `'devnet'` or `'mainnet-beta'`      |
| `solBalance`         | `number \| null`  | No        | SOL balance (refreshed at runtime)  |
| `balanceLoading`     | `boolean`         | No        | Loading state for balance fetch     |

Key behaviors:
- `setCluster()` disconnects wallet, resets balance, calls `resetConnection()` to rebuild RPC
- `fetchBalance()` only shows loading spinner on initial fetch (`solBalance === null`), not on 30s refreshes
- Persistence uses `partialize` to only store `connectedPublicKey`, `authToken`, `cluster`

### `auth-store.ts` (persisted as `cybercard-auth-session`)

| Field           | Type              | Persisted | Description                     |
| --------------- | ----------------- | --------- | ------------------------------- |
| `userId`        | `string \| null`  | Yes       | Supabase user UUID              |
| `sessionToken`  | `string \| null`  | Yes       | Custom JWT from auth-verify     |
| `authLoading`   | `boolean`         | No        | Auth flow in progress           |

Key behaviors:
- `authenticate(walletAddress, signMessage)` runs the full challenge->sign->verify flow
- **CURRENTLY NOT CALLED FROM ANY UI** - the auth flow is implemented but not wired up

### `card-store.ts` (not persisted)

| Field            | Type                 | Description                          |
| ---------------- | -------------------- | ------------------------------------ |
| `templates`      | `CardTemplate[]`     | All card archetypes from DB          |
| `myCards`        | `CardWithTemplate[]` | Cards owned by current user          |
| `activeListings` | `ListingWithCard[]`  | Active marketplace listings          |
| `mintingPack`    | `boolean`            | Pack opening in progress             |

Actions: `fetchTemplates`, `fetchMyCards(wallet)`, `fetchActiveListings`, `openPack(wallet, token)`, `listCard(cardId, wallet, price)`, `cancelListing(listingId)`

**Note:** None of these actions are called from any UI component currently. The store is fully implemented but unused.

---

## Wallet Integration (MWA)

### How MWA works
Mobile Wallet Adapter is Solana's protocol for Android apps to communicate with wallet apps (Phantom, Backpack, etc.) installed on the same device. The `transact()` function opens a session with the wallet app, and the callback receives a `wallet` object to call methods on.

### Two implementations exist

**1. `Header.tsx` (currently active)**
- Uses `try/catch require()` pattern for MWA import (safe in Expo Go where native module is missing)
- `handleConnect`: calls `wallet.authorize()` → gets public key + MWA auth token → stores in wallet-store
- `handleDisconnect`: simply calls `clearSession()` on wallet-store (does NOT call `wallet.deauthorize()`)
- Decodes Phantom's base64-encoded addresses to base58 PublicKey

**2. `hooks/useWallet.ts` (more complete, NOT used by any screen)**
- Uses static `import` for MWA (would crash in Expo Go)
- Has `connect()`, `disconnect()`, `getBalance()`, `sendSOL()` with full error handling
- `disconnect()` properly calls `wallet.deauthorize()` before clearing session
- `sendSOL()` includes: blockhash fetch → build tx → reauthorize → sign → backoff retry → confirm
- Has typed `WalletError` class for structured error handling
- None of the app's screens import or use this hook

### Connection flow (as it works today)
```
User taps "Connect" in Header
  → transact() opens Phantom
  → wallet.authorize({ cluster, identity })
  → User approves in Phantom
  → Get accounts[0].address (base64) → decode to base58
  → Store authToken in wallet-store
  → Store connectedPublicKey in wallet-store
  → Header shows address pill + SOL balance
  → Balance refreshes every 30 seconds
```

### Disconnect flow (as it works today)
```
User taps disconnect icon in Header
  → clearSession() on wallet-store
  → connectedPublicKey = null, authToken = null, solBalance = null
  → Header shows "Connect" button again
  (Phantom is NOT notified - session lingers on wallet side)
```

---

## Authentication Flow

### Designed flow (partially implemented)

```
1. App open → check AsyncStorage for valid JWT
2. Valid JWT → navigate to (tabs)/
3. No JWT or expired → navigate to (auth)/connect
4. User taps connect → MWA authorize (get pubkey)
5. POST /auth-challenge { wallet_address } → get nonce
6. Sign nonce with wallet → get signature
7. POST /auth-verify { wallet_address, signature, nonce } → get { user, token }
8. Store userId + sessionToken → navigate to (tabs)/
```

### What's actually working
- Steps 1-3: **NOT IMPLEMENTED** - no route guard, no auth check, no `(auth)/` route group
- Step 4: **WORKS** - MWA connect via Header.tsx
- Steps 5-7: **BACKEND WORKS** - edge functions are deployed and functional
- Steps 5-7: **CLIENT CODED** - `auth-store.authenticate()` has the full flow
- Steps 5-7: **NOT WIRED** - nothing in the UI calls `authenticate()`
- Step 8: **NOT IMPLEMENTED** - no navigation guard

### The gap
The wallet connects to Phantom successfully, but the app never authenticates with Supabase. This means:
- No user record is created in the `users` table
- No JWT is issued
- Protected edge functions (`mint-pack`, `marketplace-buy`) can't be called
- RLS policies based on `auth.uid()` won't work
- The card store and auth store actions exist but can never succeed

### auth-challenge edge function
- **Endpoint:** POST `/functions/v1/auth-challenge`
- **Input:** `{ wallet_address: string }`
- **Process:**
  1. Generates 32 random bytes → hex string nonce
  2. Invalidates all previous unused nonces for this wallet
  3. Inserts new nonce with 5-minute TTL into `nonces` table
- **Output:** `{ nonce: string }`

### auth-verify edge function
- **Endpoint:** POST `/functions/v1/auth-verify`
- **Input:** `{ wallet_address: string, signature: string (base64), nonce: string }`
- **Process:**
  1. Looks up nonce in DB (must exist, be unused, not expired, match wallet)
  2. Verifies Ed25519 signature using `tweetnacl` (proves wallet ownership)
  3. Marks nonce as used
  4. Upserts user in `users` table (create on first login, update `updated_at` on return)
  5. Signs custom JWT (HS256) with claims: `{ sub: userId, wallet_address, role: 'authenticated' }`
  6. JWT expires in 7 days
- **Output:** `{ user: User, token: string }`
- **Dependencies:** `tweetnacl` (sig verify), `bs58` (decode wallet address), `jose` (JWT signing)

---

## Supabase Backend

### Client setup (`lib/supabase.ts`)
- Creates typed `SupabaseClient<Database>` using env vars
- Auth uses `asyncStorageAdapter` for session persistence
- `detectSessionInUrl: false` (no browser URLs in React Native)
- Warns in `__DEV__` if env vars are missing

### Admin client (`_shared/supabase-admin.ts`)
- Uses `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase in edge functions)
- Bypasses RLS - used by all edge functions for privileged operations
- NEVER exposed to the client

### JWT verification (`_shared/verify-jwt.ts`)
- Extracts `Bearer <token>` from Authorization header
- Verifies with `SUPABASE_JWT_SECRET` using `jose` library
- Returns `{ sub, wallet_address, role }` or `null`

---

## Database Schema

### Tables

**`users`** - Wallet-based player identity
```sql
id             uuid PK (auto-generated)
wallet_address text UNIQUE NOT NULL
username       text (nullable)
avatar_url     text (nullable)
xp             integer DEFAULT 0
level          integer DEFAULT 1
energy         integer DEFAULT 100 (range: 0-100)
win_streak     integer DEFAULT 0
total_wins     integer DEFAULT 0
total_losses   integer DEFAULT 0
created_at     timestamptz
updated_at     timestamptz (auto-updated via trigger)
```

**`nonces`** - Short-lived auth challenge tokens
```sql
id             uuid PK
wallet_address text NOT NULL
nonce          text UNIQUE NOT NULL
expires_at     timestamptz NOT NULL
used           boolean DEFAULT false
created_at     timestamptz
```

**`card_templates`** - Game-defined card archetypes (3 seeded)
```sql
id            uuid PK
name          text NOT NULL
description   text
rarity        ENUM('COMMON','RARE','EPIC','LEGENDARY')
element       ENUM('FIRE','WATER','EARTH','AIR','LIGHTNING','SHADOW')
base_attack   integer (>0)
base_defense  integer (>0)
base_hp       integer (>0)
image_url     text          -- currently local paths like 'assets/cards/f1.png'
spawn_weight  integer 0-100 -- higher = more common in packs
created_at    timestamptz
```

**`cards`** - Individual owned card instances
```sql
id             uuid PK
mint_address   text UNIQUE      -- NULL (Phase 2: Solana pNFT mint address)
template_id    uuid FK -> card_templates
owner_id       uuid FK -> users
serial_number  integer          -- unique per template (auto-incremented in mint-pack)
metadata_uri   text             -- NULL (Phase 2: IPFS metadata JSON URI)
level          integer DEFAULT 1
xp             integer DEFAULT 0
attack         integer          -- initialized from template's base_attack
defense        integer          -- initialized from template's base_defense
hp             integer          -- initialized from template's base_hp
tx_signature   text             -- NULL (Phase 2: mint transaction signature)
created_at     timestamptz
updated_at     timestamptz
UNIQUE(template_id, serial_number)
```

**`listings`** - Marketplace listings
```sql
id            uuid PK
card_id       uuid FK -> cards
seller_id     uuid FK -> users
buyer_id      uuid FK -> users (nullable, set on purchase)
price_sol     numeric(12,9)    -- returned as STRING by supabase-js
status        ENUM('ACTIVE','SOLD','CANCELLED')
tx_signature  text             -- optional SOL transfer tx
listed_at     timestamptz
sold_at       timestamptz
```

**`battles`** - PvP match records
```sql
id                     uuid PK
challenger_id          uuid FK -> users
opponent_id            uuid FK -> users (nullable until joined)
challenger_deck        uuid[] (exactly 3 card IDs)
opponent_deck          uuid[] (exactly 3 or NULL)
challenger_hp          jsonb { "cardId": hp }
opponent_hp            jsonb (nullable)
active_challenger_card integer 0-2
active_opponent_card   integer (nullable)
winner_id              uuid FK -> users (nullable)
status                 ENUM('OPEN','ACTIVE','COMPLETED')
xp_reward              integer DEFAULT 50
created_at             timestamptz
completed_at           timestamptz
```

**`battle_moves`** - Turn-by-turn battle log
```sql
id           uuid PK
battle_id    uuid FK -> battles
player_id    uuid FK -> users
turn_number  integer (>0)
move_type    ENUM('ATTACK','SWITCH','FORFEIT')
card_used    uuid FK -> cards (nullable for FORFEIT)
target_card  uuid FK -> cards (nullable)
damage_dealt integer (nullable)
created_at   timestamptz
UNIQUE(battle_id, turn_number, player_id)
```

### Seeded card templates

| Name             | Rarity    | Element | ATK | DEF | HP | Weight | Image           |
| ---------------- | --------- | ------- | --- | --- | -- | ------ | --------------- |
| Little Wyrm      | COMMON    | FIRE    | 5   | 3   | 20 | 60     | assets/cards/f1.png |
| Neptune's Wrath  | LEGENDARY | WATER   | 15  | 8   | 45 | 3      | assets/cards/f2.png |
| Valor Knight     | EPIC      | EARTH   | 12  | 10  | 35 | 12     | assets/cards/f3.png |

Pack odds (total weight = 75): COMMON 80%, EPIC 16%, LEGENDARY 4%

### Row Level Security (RLS)

| Table          | SELECT                        | INSERT              | UPDATE                     |
| -------------- | ----------------------------- | ------------------- | -------------------------- |
| card_templates | Public (anyone)               | -                   | -                          |
| users          | Public                        | -                   | Own only (`id = auth.uid()`) |
| nonces         | **DENIED** (service_role only) | -                  | -                          |
| cards          | Public                        | -                   | Owner only                 |
| listings       | Public                        | Own (`seller_id`)   | Seller or buyer            |
| battles        | OPEN or participant           | Own (`challenger_id`)| Participant only          |
| battle_moves   | Participant (via battle join) | Own (`player_id`)   | -                          |

### Database functions
- **`execute_marketplace_purchase(listing_id, buyer_id, tx_signature?)`** — Atomic: marks listing SOLD + transfers card ownership in one transaction. Raises exception on concurrent purchase.
- **`update_updated_at()`** — Trigger function auto-updating `updated_at` on `users` and `cards` tables.

---

## Edge Functions

All edge functions run on Deno, use `Deno.serve()`, import from `https://esm.sh/`, and include `@ts-nocheck` for IDE compatibility.

### `auth-challenge`
- **Auth:** None (public)
- **Method:** POST
- **Input:** `{ wallet_address }`
- **Output:** `{ nonce }` (64-char hex string)
- **Side effects:** Inserts nonce row, invalidates previous nonces for wallet

### `auth-verify`
- **Auth:** None (public, but requires valid nonce)
- **Method:** POST
- **Input:** `{ wallet_address, signature (base64), nonce }`
- **Output:** `{ user: User, token: string (JWT) }`
- **Side effects:** Marks nonce used, upserts user row

### `mint-pack`
- **Auth:** JWT required (Bearer token)
- **Method:** POST
- **Input:** `{ wallet_address }`
- **Output:** `{ cards: CardWithTemplate[] }` (3 cards)
- **Validation:** JWT wallet must match request wallet, user needs >= 10 energy
- **Side effects:** Deducts 10 energy, creates 3 card rows with serial number retry logic

### `marketplace-buy`
- **Auth:** JWT required (Bearer token)
- **Method:** POST
- **Input:** `{ listing_id, tx_signature? }`
- **Output:** `{ listing: ListingWithCard }`
- **Validation:** Listing must be ACTIVE, buyer != seller
- **Side effects:** Calls `execute_marketplace_purchase` RPC for atomic update

---

## Card System

### Current state: Database cards only (NO NFTs)

Cards are purely Supabase database records. The NFT fields (`mint_address`, `metadata_uri`, `tx_signature`) exist in the schema but are always `NULL`.

### How cards are created
1. User calls `mint-pack` edge function with their JWT
2. Function checks energy >= 10, deducts 10
3. Rolls 3 cards using weighted random selection from `card_templates`
4. For each card: finds max `serial_number` for that template, increments by 1
5. Inserts card row with template's base stats copied to card's `attack`, `defense`, `hp`
6. Retries up to 3 times on serial number conflicts (race safety)

### Card images
- 3 PNG files exist in `assets/cards/`: f1.png, f2.png, f3.png
- Referenced in DB seed as `image_url: 'assets/cards/f1.png'` etc.
- These are local paths, not URLs - would need to be resolved with `require()` in RN
- **No component currently renders card images from the database** - the RosterSection uses gradient placeholders

### Card stats
- Each card has its own `attack`, `defense`, `hp` (copied from template on creation)
- Cards have `level` (starts at 1) and `xp` (starts at 0)
- No leveling/XP logic is implemented

### Phase 2 (planned)
- Metaplex UMI for pNFT minting on Solana Devnet
- IPFS metadata upload (card image + JSON attributes)
- Fill in `mint_address`, `metadata_uri`, `tx_signature` on each card
- Cards become actual on-chain assets held in the player's wallet

---

## Marketplace

### How it works (backend only - no UI)

**Listing a card:**
- `card-store.listCard(cardId, sellerWallet, priceSol)` looks up user by wallet, inserts into `listings` table
- Uses client Supabase (not edge function), so RLS applies (`seller_id = auth.uid()`)

**Buying a card:**
- Client calls `marketplace-buy` edge function with JWT + `listing_id`
- Function verifies JWT, checks listing is ACTIVE, prevents self-buy
- Calls `execute_marketplace_purchase` Postgres function (atomic: mark SOLD + transfer card)
- Returns updated listing with card data

**Cancelling:**
- `card-store.cancelListing(listingId)` updates listing status to `CANCELLED`

**Note:** `price_sol` is `numeric(12,9)` in Postgres → returned as `string` by supabase-js. Typed accordingly in `database.ts`.

---

## Design System

All visual tokens live in `constants/theme.ts`. No hardcoded colors/spacing anywhere else.

### Colors
```
bgVoid:            #080808     (deepest background)
bgSurface:         #141414     (cards, modals)
bgSurfaceElevated: #1F1F1F     (elevated surfaces)
accentPrimary:     #CCFF00     (lime green - primary action, BATTLE button, active states)
accentSecondary:   #FF4D00     (orange - streaks, warnings, disconnect)
textPrimary:       #FFFFFF
textSecondary:     #999999
textTertiary:      #555555
textOnAccent:      #000000     (text on lime buttons)
```

### Spacing
```
xs: 8  |  sm: 16  |  md: 24  |  lg: 32
```

### Border Radii
```
sm: 12  |  md: 20  |  lg: 32  |  pill: 999
```

### Fonts
```
regular:   PlusJakartaSans_400Regular
medium:    PlusJakartaSans_500Medium
semiBold:  PlusJakartaSans_600SemiBold
bold:      PlusJakartaSans_700Bold
extraBold: PlusJakartaSans_800ExtraBold
```

### Design rules
- Dark theme only
- No CSS shorthands (`backgroundColor` not `background`)
- No unnecessary animations (only tab bar has spring animations)
- All styling via `StyleSheet.create()`

---

## Environment Variables

### Client (`.env` - filled)
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_DEVNET_RPC_URL=<alchemy-devnet-rpc>
EXPO_PUBLIC_MAINNET_RPC_URL=<optional-mainnet-rpc>
```

### Edge Functions (auto-injected by Supabase)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
```

### Optional client vars
```
EXPO_PUBLIC_APP_NAME      (default: "CyberCard Arena")
EXPO_PUBLIC_APP_URI       (default: "https://cybercard.arena")
EXPO_PUBLIC_APP_ICON      (default: "favicon.ico")
```

---

## Known Issues & Gaps

### Critical
1. **Auth not wired** — `auth-store.authenticate()` exists but is never called from UI. Users can browse all tabs without authenticating with Supabase.
2. **No `(auth)/` route group** — The auth gate screen doesn't exist. No routing guard prevents unauthenticated access.
3. **No `signMessage` in MWA flow** — The Header's `handleConnect` only does `wallet.authorize()`. The auth flow needs `wallet.signMessages()` in the same `transact()` session, but this isn't implemented.
4. **Disconnect doesn't deauthorize** — `Header.handleDisconnect` just clears local state. The proper `useWallet.disconnect()` calls `wallet.deauthorize()` but Header doesn't use it.

### Moderate
5. **JWT has no refresh** — 7-day expiry with no refresh logic. When it expires, all protected API calls fail silently.
6. **Two wallet implementations** — `Header.tsx` has inline MWA logic AND `useWallet.ts` hook exists separately. They duplicate `decodeAddress()` and connect logic. Should consolidate.
7. **Home screen is all hardcoded** — Energy, streak, roster, hero card are all static. Not connected to any store or API.
8. **`price_sol` string handling** — Typed as string from Supabase but `card-store.listCard()` accepts `number` param. Works because Supabase insert accepts both, but could cause confusion.
9. **Signature encoding** — `auth-store.ts:55` uses `btoa(String.fromCharCode(...signatureBytes))`. Spreading 64 bytes works but is a fragile pattern.
10. **Drawer ID type cast** — `id={"drawer" as any}` in drawer layout is a type workaround.

### Minor
11. **`app.json` still has default name** — `"name": "project"`, `"slug": "project"`, `"package": "com.anonymous.project"`
12. **HeroCard has hardcoded `#ccc` color** — Line 100 of HeroCard.tsx uses `color: '#ccc'` instead of a theme token
13. **No error boundaries** — No global error handling in root layout
14. **Card images not rendered** — DB has `image_url` paths but no component loads actual card art

---

## What's Not Built Yet

| Feature                          | Priority | Notes                                      |
| -------------------------------- | -------- | ------------------------------------------ |
| Auth screen `(auth)/connect.tsx` | HIGH     | Unified MWA + Supabase auth in one flow    |
| Auth route guard                 | HIGH     | Root layout checks JWT → tabs or connect   |
| Wire `signMessage` into MWA flow | HIGH     | Needed for auth-verify to work             |
| Connect Home screen to stores    | HIGH     | Energy, streak, roster from Supabase       |
| Inventory screen                 | MEDIUM   | Show user's cards from card-store          |
| Shop / Pack opening UI           | MEDIUM   | Call mint-pack, show card reveal animation |
| Marketplace UI                   | MEDIUM   | Browse listings, buy cards                 |
| Card detail screen               | MEDIUM   | Full card view with stats and image        |
| Battle gameplay                  | LOW      | Battle arena, turn-based combat UI         |
| Battle edge functions            | LOW      | create, join, move, resolve                |
| Friends system                   | LOW      | Friend list, invites                       |
| Rankings / Leaderboard           | LOW      | Win/loss/streak rankings                   |
| NFT minting (Metaplex UMI)      | PHASE 2  | pNFT on Devnet + IPFS metadata             |
| JWT refresh logic                | MEDIUM   | Handle expiry gracefully                   |
| `npx expo prebuild`             | HIGH     | Required before any on-device testing      |
| `eas.json` config                | LOW      | For EAS Build / production builds          |
