# Solana Mobile Trading Card Game — Full Project Plan

> Architecture updated: No separate backend server.
> Supabase (Edge Functions + PostgreSQL + RLS) replaces Node.js/Fastify entirely.

---

## Overview

A production-level Android dApp for the Monolith/Solana Mobile hackathon. Users connect via Mobile Wallet Adapter (Phantom/Backpack), collect NFT trading cards (Metaplex pNFT on Devnet), trade them in a marketplace, and battle other players using their owned cards. Wallet address = identity. Supabase PostgreSQL stores profiles and caches off-chain data. Solana is the source of truth for ownership.

---

## Final Tech Stack

| Layer           | Technology                                                           |
| --------------- | -------------------------------------------------------------------- |
| Mobile          | React Native 0.81.5 + Expo 54 (bare workflow)                        |
| Routing         | expo-router v6 (file-based)                                          |
| Wallet          | @solana-mobile/mobile-wallet-adapter-protocol-web3js                 |
| Solana          | @solana/web3.js v1, Devnet                                           |
| NFTs            | Metaplex pNFT — @metaplex-foundation/umi + mpl-token-metadata        |
| State           | Zustand v5 (client + server state — no TanStack Query)               |
| Local storage   | @react-native-async-storage/async-storage (Supabase session adapter) |
| Backend         | **Supabase Edge Functions** (Deno/TypeScript) — NO separate server   |
| Database        | **Supabase PostgreSQL** with RLS — NO Prisma                         |
| DB client       | **@supabase/supabase-js** — replaces Axios + custom JWT              |
| Target platform | **Android only** (MWA is Android-exclusive)                          |
| NFT Storage     | NFT.Storage (free IPFS + Filecoin)                                   |
| Auth            | Wallet signature (tweetnacl in Edge Function) → custom Supabase JWT  |
| Build           | EAS Build (APK)                                                      |

---

## Architecture Diagram

```
Android App (Expo bare workflow)
        │
        │  @supabase/supabase-js
        ▼
  Supabase Platform
  ┌─────────────────────────────────────────┐
  │  Edge Functions (Deno)                  │
  │  ├── auth-challenge  (nonce gen)        │
  │  ├── auth-verify     (sig verify + JWT) │
  │  ├── mint-pack       (treasury minting) │
  │  ├── marketplace-buy (NFT transfer)     │
  │  ├── battle-challenge (create battle)   │
  │  ├── battle-accept   (accept + start)   │
  │  └── battle-move     (submit move)      │
  │                                         │
  │  PostgreSQL + RLS                       │
  │  ├── users, cards, card_templates       │
  │  ├── listings, nonces                   │
  │  ├── battles, battle_moves              │
  │  └── Row Level Security policies        │
  │                                         │
  │  Realtime (required for battles)        │
  │  ├── Live battle state sync             │
  │  └── Live collection updates            │
  └─────────────────────────────────────────┘
        │
        │  @solana/web3.js + Metaplex UMI
        ▼
  Solana Devnet (pNFT ownership)
        │
        ▼
  NFT.Storage IPFS (card metadata + art)
```

---

## Complete File Structure

```
project/                              ← Expo mobile app root
├── index.js                          ← Entry point (polyfills MUST be first import)
├── polyfills.ts                      ← crypto, Buffer, URL polyfills
├── app.json                          ← android package + scheme + intent filters
├── eas.json                          ← EAS Build profiles
├── CLAUDE.md
├── PLAN.md
│
├── app/
│   ├── _layout.tsx                   ← Root layout + all providers
│   ├── index.tsx                     ← Splash / redirect logic
│   ├── (auth)/
│   │   └── connect.tsx               ← Wallet connect screen
│   ├── (tabs)/
│   │   ├── _layout.tsx               ← Tab navigator (4 tabs)
│   │   ├── collection.tsx            ← My NFT cards
│   │   ├── marketplace.tsx           ← Browse + buy cards
│   │   ├── battle.tsx                ← Battle lobby: pending + open challenges
│   │   └── profile.tsx               ← User stats + settings
│   ├── card/
│   │   └── [id].tsx                  ← Card detail screen
│   └── battle/
│       └── [id].tsx                  ← Live battle arena screen
│
├── components/
│   ├── wallet/
│   │   ├── ConnectButton.tsx
│   │   └── WalletAvatar.tsx
│   ├── cards/
│   │   ├── CardItem.tsx              ← FlatList grid item
│   │   ├── CardDetail.tsx            ← Full card face with stats
│   │   └── RarityBadge.tsx
│   ├── battle/
│   │   ├── BattleArena.tsx           ← Main battle layout (your field + opponent field)
│   │   ├── BattleCard.tsx            ← Card in battle with live HP bar
│   │   ├── DeckPicker.tsx            ← Modal to pick 3 cards before a battle
│   │   ├── MoveLog.tsx               ← Scrollable log of damage events
│   │   └── ElementBadge.tsx          ← Element icon + advantage indicator
│   └── ui/
│       ├── Button.tsx
│       ├── LoadingOverlay.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useAuthorization.ts           ← MWA session management + re-auth
│   ├── useCards.ts                   ← Zustand + Supabase card fetching
│   ├── useMint.ts                    ← Pack minting with loading state
│   └── useBattle.ts                  ← Supabase Realtime battle state + move submission
│
├── lib/
│   ├── solana/
│   │   ├── connection.ts             ← Solana RPC connection singleton
│   │   └── mwa.ts                    ← MWA transact() wrappers
│   └── supabase/
│       └── client.ts                 ← Supabase client singleton (with AsyncStorage adapter)
│
├── constants/
│   ├── config.ts                     ← RPC URL, Supabase URL, cluster
│   └── cards.ts                      ← Card template defs + rarity weights
│
├── types/
│   └── index.ts                      ← All shared TypeScript types
│
└── supabase/                         ← Supabase project (deploy with Supabase CLI)
    ├── functions/
    │   ├── auth-challenge/
    │   │   └── index.ts              ← POST: generate nonce for wallet to sign
    │   ├── auth-verify/
    │   │   └── index.ts              ← POST: verify sig → return custom JWT
    │   ├── mint-pack/
    │   │   └── index.ts              ← POST: mint 5 pNFTs using treasury keypair
    │   └── marketplace-buy/
    │       └── index.ts              ← POST: transfer NFT + update listing
    └── migrations/
        └── 001_init.sql              ← All tables + RLS policies
```

---

## Database Schema (SQL — run via Supabase migrations)

```sql
-- supabase/migrations/001_init.sql

-- Users (wallet address is the identity)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username     TEXT,
  avatar_url   TEXT,
  xp           INTEGER DEFAULT 0,
  level        INTEGER DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Card templates (game-defined archetypes)
CREATE TABLE card_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  rarity       TEXT CHECK (rarity IN ('COMMON','RARE','EPIC','LEGENDARY')) NOT NULL,
  element      TEXT CHECK (element IN ('FIRE','WATER','EARTH','AIR','LIGHTNING','SHADOW')) NOT NULL,
  attack       INTEGER NOT NULL,
  defense      INTEGER NOT NULL,
  hp           INTEGER NOT NULL,
  image_url    TEXT NOT NULL,   -- IPFS URI of card art
  total_minted INTEGER DEFAULT 0,
  max_supply   INTEGER          -- NULL = unlimited
);

-- Minted NFT cards (bridge between on-chain and off-chain)
CREATE TABLE cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address TEXT UNIQUE NOT NULL,  -- Solana mint (source of truth)
  template_id  UUID NOT NULL REFERENCES card_templates(id),
  owner_id     UUID NOT NULL REFERENCES users(id),
  serial_number INTEGER NOT NULL,
  metadata_uri TEXT NOT NULL,          -- IPFS URI of this card's metadata JSON
  mint_tx_sig  TEXT NOT NULL,          -- Solana tx signature
  is_listed    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace listings
CREATE TABLE listings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID UNIQUE NOT NULL REFERENCES cards(id),
  seller_id    UUID NOT NULL REFERENCES users(id),
  price_sol    FLOAT NOT NULL,
  status       TEXT CHECK (status IN ('ACTIVE','SOLD','CANCELLED')) DEFAULT 'ACTIVE',
  tx_sig       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  sold_at      TIMESTAMPTZ
);

-- Battles (1v1 card battles)
CREATE TABLE battles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   UUID NOT NULL REFERENCES users(id),
  opponent_id     UUID REFERENCES users(id),        -- NULL until accepted
  challenger_deck UUID[] NOT NULL,                  -- array of card IDs (3 cards)
  opponent_deck   UUID[],                           -- set on accept
  status          TEXT CHECK (status IN ('OPEN','ACTIVE','COMPLETED','CANCELLED')) DEFAULT 'OPEN',
  current_turn    UUID REFERENCES users(id),        -- whose turn it is
  winner_id       UUID REFERENCES users(id),
  state           JSONB NOT NULL DEFAULT '{}',      -- full mutable battle state (HP, active cards)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Battle moves log (append-only, for replay + audit)
CREATE TABLE battle_moves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID NOT NULL REFERENCES battles(id),
  player_id   UUID NOT NULL REFERENCES users(id),
  move_type   TEXT CHECK (move_type IN ('ATTACK','SWITCH','FORFEIT')) NOT NULL,
  attacker_id UUID REFERENCES cards(id),            -- card that attacked
  target_id   UUID REFERENCES cards(id),            -- card that was hit
  damage      INTEGER,                              -- calculated damage dealt
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for battles
ALTER TABLE battles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_moves ENABLE ROW LEVEL SECURITY;

-- Anyone can see OPEN battles (to join)
CREATE POLICY "battles_select_open"       ON battles FOR SELECT USING (status = 'OPEN');
-- Participants can see their own battles
CREATE POLICY "battles_select_own"        ON battles FOR SELECT USING (challenger_id = auth.uid() OR opponent_id = auth.uid());
-- Anyone can see moves of a battle they are part of
CREATE POLICY "battle_moves_select_own"   ON battle_moves FOR SELECT USING (
  EXISTS (SELECT 1 FROM battles b WHERE b.id = battle_id AND (b.challenger_id = auth.uid() OR b.opponent_id = auth.uid()))
);

-- Nonces for wallet auth (single-use, 5min TTL)
CREATE TABLE nonces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address    TEXT NOT NULL,
  value      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER users_updated_at  BEFORE UPDATE ON users  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cards_updated_at  BEFORE UPDATE ON cards  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: enable on all user-facing tables
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Users: read + update own profile only
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Cards: owner sees their own cards
CREATE POLICY "cards_select_own" ON cards FOR SELECT USING (owner_id = auth.uid());

-- Listings: anyone can read active listings (for marketplace browse)
CREATE POLICY "listings_select_active" ON listings FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "listings_select_own"    ON listings FOR SELECT USING (seller_id = auth.uid());
```

---

## All Package Installs

### Mobile App (run from project root)

```bash
# Supabase client — replaces Axios + custom JWT handling
npm install @supabase/supabase-js

# Core Solana + Mobile Wallet Adapter
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js \
  @solana-mobile/mobile-wallet-adapter-protocol \
  @solana/web3.js

# Metaplex / UMI — pin to same minor version to avoid type conflicts
npm install @metaplex-foundation/umi \
  @metaplex-foundation/umi-bundle-defaults \
  @metaplex-foundation/mpl-token-metadata

# Polyfills — CRITICAL, Solana crypto breaks without these
npm install react-native-get-random-values \
  react-native-url-polyfill \
  buffer

# State management (Zustand only — no TanStack Query)
npm install zustand

# Local storage (used as Supabase session adapter)
npm install @react-native-async-storage/async-storage

# UI
npm install react-native-fast-image \
  react-native-linear-gradient
```

### Supabase CLI (run once, globally)

```bash
npm install -g supabase
supabase login
supabase init        # run from project root — creates supabase/ folder
supabase link --project-ref <your-project-ref>
```

---

## Critical Infrastructure Files

### `index.js` — Entry point (polyfills MUST be first)

```js
// Order is critical — do NOT move these lines
import "./polyfills";
import "expo-router/entry";
```

### `polyfills.ts`

```typescript
// 1. Random values — Solana keypair generation depends on this
import "react-native-get-random-values";

// 2. URL API — @solana/web3.js uses URL internally
import "react-native-url-polyfill/auto";

// 3. Buffer — required by Solana, Metaplex, and bs58
import { Buffer } from "buffer";
global.Buffer = Buffer;
```

### `app.json` — Required additions

```json
{
  "expo": {
    "scheme": "solanacard",
    "android": {
      "package": "com.yourname.solanacard",
      "intentFilters": [
        {
          "action": "android.intent.action.VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "solanacard" }],
          "category": [
            "android.intent.category.DEFAULT",
            "android.intent.category.BROWSABLE"
          ]
        }
      ]
    }
  }
}
```

### `eas.json`

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### `constants/config.ts`

```typescript
export const SOLANA_RPC_URL = "https://api.devnet.solana.com";
export const SOLANA_CLUSTER = "devnet" as const;
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const APP_IDENTITY = {
  name: "SolanaCards",
  uri: "https://solanacards.app", // must match scheme in app.json
  icon: "./assets/images/icon.png",
};
```

### `lib/supabase/client.ts` — Client with AsyncStorage session adapter

```typescript
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/constants/config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false, // wallet re-auth handles session renewal
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### `lib/solana/connection.ts`

```typescript
import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/constants/config";

let _connection: Connection | null = null;

// Singleton — never create multiple Connection instances
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return _connection;
}
```

---

## Supabase Edge Functions

### `supabase/functions/auth-challenge/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const { address } = await req.json();
  if (!address)
    return new Response(JSON.stringify({ error: "address required" }), {
      status: 400,
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nonce = crypto.randomUUID();
  const message = `Sign in to SolanaCards\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await supabase
    .from("nonces")
    .insert({ address, value: nonce, expires_at: expiresAt });

  return new Response(JSON.stringify({ nonce: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### `supabase/functions/auth-verify/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import nacl from "npm:tweetnacl";
import bs58 from "npm:bs58";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const { address, signature, nonce } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Extract the UUID nonce value from the full message string
  const nonceValue = nonce.split("Nonce: ")[1]?.split("\n")[0];

  const { data: nonceRecord } = await supabase
    .from("nonces")
    .select()
    .eq("address", address)
    .eq("value", nonceValue)
    .eq("used", false)
    .single();

  if (!nonceRecord)
    return new Response(JSON.stringify({ error: "Invalid nonce" }), {
      status: 401,
      headers: corsHeaders,
    });
  if (new Date(nonceRecord.expires_at) < new Date())
    return new Response(JSON.stringify({ error: "Nonce expired" }), {
      status: 401,
      headers: corsHeaders,
    });

  // Verify Ed25519 signature
  const messageBytes = new TextEncoder().encode(nonce);
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = bs58.decode(address);
  const valid = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes,
  );

  if (!valid)
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: corsHeaders,
    });

  // Mark nonce as used (single-use)
  await supabase.from("nonces").update({ used: true }).eq("id", nonceRecord.id);

  // Upsert user by wallet address
  const { data: user } = await supabase
    .from("users")
    .upsert({ wallet_address: address }, { onConflict: "wallet_address" })
    .select()
    .single();

  // Sign a custom JWT with Supabase's JWT secret
  // sub = user.id makes auth.uid() work correctly in RLS policies
  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const accessToken = await create(
    { alg: "HS256", typ: "JWT" },
    {
      sub: user.id,
      role: "authenticated",
      wallet_address: address,
      aud: "authenticated",
      iat: getNumericDate(0),
      exp: getNumericDate(7 * 24 * 60 * 60), // 7 days
    },
    key,
  );

  return new Response(JSON.stringify({ access_token: accessToken, user }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### `supabase/functions/mint-pack/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { Connection, Keypair, PublicKey } from "npm:@solana/web3.js";
// Note: Use @metaplex-foundation/js (legacy) in Deno — better ESM compat than UMI
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "npm:@metaplex-foundation/js";
import { NFTStorage, Blob } from "npm:nft.storage";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rarity weights: [COMMON=60%, RARE=25%, EPIC=12%, LEGENDARY=3%]
function pickRarity(): string {
  const roll = Math.random() * 100;
  if (roll < 60) return "COMMON";
  if (roll < 85) return "RARE";
  if (roll < 97) return "EPIC";
  return "LEGENDARY";
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  // Verify JWT from app
  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Decode JWT to get user id (validate on Supabase side)
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser(token);
  if (!authUser)
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: corsHeaders,
    });

  // Get db user
  const { data: dbUser } = await supabase
    .from("users")
    .select()
    .eq("id", authUser.id)
    .single();

  // Load treasury keypair from secrets
  const treasuryBytes = JSON.parse(Deno.env.get("TREASURY_PRIVATE_KEY")!);
  const treasury = Keypair.fromSecretKey(Uint8Array.from(treasuryBytes));

  const connection = new Connection(
    Deno.env.get("SOLANA_RPC_URL")!,
    "confirmed",
  );
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(treasury))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: Deno.env.get("SOLANA_RPC_URL")!,
        timeout: 60000,
      }),
    );

  const nftStorage = new NFTStorage({
    token: Deno.env.get("NFTSTORAGE_API_KEY")!,
  });

  // Fetch all card templates
  const { data: templates } = await supabase.from("card_templates").select();

  const mintedCards = [];

  for (let i = 0; i < 5; i++) {
    const rarity = pickRarity();
    const rarityTemplates = templates!.filter((t) => t.rarity === rarity);
    const template =
      rarityTemplates[Math.floor(Math.random() * rarityTemplates.length)];
    const serialNumber = template.total_minted + 1;

    // Build NFT metadata
    const metadata = {
      name: `${template.name} #${serialNumber}`,
      description: template.description,
      image: template.image_url,
      attributes: [
        { trait_type: "Rarity", value: template.rarity },
        { trait_type: "Element", value: template.element },
        { trait_type: "Attack", value: template.attack },
        { trait_type: "Defense", value: template.defense },
        { trait_type: "HP", value: template.hp },
        { trait_type: "Serial", value: serialNumber },
      ],
    };

    // Upload metadata to NFT.Storage (IPFS)
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });
    const metadataCid = await nftStorage.storeBlob(metadataBlob);
    const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;

    // Mint pNFT on Solana Devnet
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: metadata.name,
      sellerFeeBasisPoints: 500, // 5% royalty
      tokenOwner: new PublicKey(dbUser.wallet_address),
    });

    // Save to DB
    const { data: card } = await supabase
      .from("cards")
      .insert({
        mint_address: nft.address.toString(),
        template_id: template.id,
        owner_id: dbUser.id,
        serial_number: serialNumber,
        metadata_uri: metadataUri,
        mint_tx_sig: nft.token.address.toString(), // store creation tx
      })
      .select()
      .single();

    // Increment template counter
    await supabase
      .from("card_templates")
      .update({ total_minted: serialNumber })
      .eq("id", template.id);

    mintedCards.push({ ...card, template });
  }

  return new Response(JSON.stringify({ cards: mintedCards }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### `supabase/functions/battle-challenge/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

  const { deck } = await req.json();  // deck: string[] — 3 card IDs owned by caller

  // Validate: exactly 3 cards, all owned by caller, none currently in another active battle
  if (!Array.isArray(deck) || deck.length !== 3)
    return new Response(JSON.stringify({ error: "deck must be exactly 3 card IDs" }), { status: 400, headers: corsHeaders });

  const { data: cards } = await supabase.from("cards").select("id, owner_id, template:card_templates(attack,defense,hp,element)").in("id", deck);
  if (!cards || cards.length !== 3 || cards.some((c: any) => c.owner_id !== user.id))
    return new Response(JSON.stringify({ error: "Invalid deck — cards must be yours" }), { status: 400, headers: corsHeaders });

  // Build initial state: each card starts at full HP
  const initialState = {
    challenger: {
      deck: cards.map((c: any) => ({
        card_id: c.id,
        current_hp: c.template.hp,
        max_hp: c.template.hp,
        attack: c.template.attack,
        defense: c.template.defense,
        element: c.template.element,
        defeated: false,
      })),
      active_index: 0,
    },
    opponent: null,  // filled on accept
  };

  const { data: battle, error } = await supabase
    .from("battles")
    .insert({ challenger_id: user.id, challenger_deck: deck, state: initialState })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  return new Response(JSON.stringify({ battle }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### `supabase/functions/battle-accept/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

  const { battle_id, deck } = await req.json();

  const { data: battle } = await supabase.from("battles").select().eq("id", battle_id).eq("status", "OPEN").single();
  if (!battle) return new Response(JSON.stringify({ error: "Battle not found or already started" }), { status: 404, headers: corsHeaders });
  if (battle.challenger_id === user.id) return new Response(JSON.stringify({ error: "Cannot join your own battle" }), { status: 400, headers: corsHeaders });

  if (!Array.isArray(deck) || deck.length !== 3)
    return new Response(JSON.stringify({ error: "deck must be exactly 3 card IDs" }), { status: 400, headers: corsHeaders });

  const { data: cards } = await supabase.from("cards").select("id, owner_id, template:card_templates(attack,defense,hp,element)").in("id", deck);
  if (!cards || cards.length !== 3 || cards.some((c: any) => c.owner_id !== user.id))
    return new Response(JSON.stringify({ error: "Invalid deck — cards must be yours" }), { status: 400, headers: corsHeaders });

  const opponentState = {
    deck: cards.map((c: any) => ({
      card_id: c.id,
      current_hp: c.template.hp,
      max_hp: c.template.hp,
      attack: c.template.attack,
      defense: c.template.defense,
      element: c.template.element,
      defeated: false,
    })),
    active_index: 0,
  };

  const newState = { ...battle.state, opponent: opponentState };

  // Challenger goes first
  const { data: updated } = await supabase
    .from("battles")
    .update({ opponent_id: user.id, opponent_deck: deck, status: "ACTIVE", current_turn: battle.challenger_id, state: newState })
    .eq("id", battle_id)
    .select()
    .single();

  return new Response(JSON.stringify({ battle: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### `supabase/functions/battle-move/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Element advantage table: attacker element → weakened defender elements
const ELEMENT_ADVANTAGE: Record<string, string[]> = {
  FIRE: ["AIR"],
  AIR: ["EARTH"],
  EARTH: ["WATER"],
  WATER: ["FIRE"],
  LIGHTNING: [],   // neutral
  SHADOW: [],      // neutral
};

function calcDamage(atk: number, def: number, atkElem: string, defElem: string): number {
  const advantage = ELEMENT_ADVANTAGE[atkElem]?.includes(defElem);
  const multiplier = advantage ? 1.5 : 1.0;
  return Math.max(1, Math.floor((atk * multiplier) - def));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

  const { battle_id, move_type } = await req.json();
  // move_type: "ATTACK" | "FORFEIT"

  const { data: battle } = await supabase.from("battles").select().eq("id", battle_id).eq("status", "ACTIVE").single();
  if (!battle) return new Response(JSON.stringify({ error: "Battle not found" }), { status: 404, headers: corsHeaders });
  if (battle.current_turn !== user.id) return new Response(JSON.stringify({ error: "Not your turn" }), { status: 403, headers: corsHeaders });

  const state = battle.state;
  const isChallenger = battle.challenger_id === user.id;
  const mySide = isChallenger ? "challenger" : "opponent";
  const opSide = isChallenger ? "opponent" : "challenger";

  if (move_type === "FORFEIT") {
    await supabase.from("battles").update({ status: "COMPLETED", winner_id: isChallenger ? battle.opponent_id : battle.challenger_id }).eq("id", battle_id);
    await supabase.from("battle_moves").insert({ battle_id, player_id: user.id, move_type: "FORFEIT" });
    // Award XP: winner +50, loser +10
    await supabase.from("users").update({ xp: supabase.rpc("increment_xp", { amount: 50 }) }).eq("id", isChallenger ? battle.opponent_id : battle.challenger_id);
    return new Response(JSON.stringify({ result: "forfeited" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (move_type === "ATTACK") {
    const myActive = state[mySide].deck[state[mySide].active_index];
    const opActive = state[opSide].deck[state[opSide].active_index];

    const damage = calcDamage(myActive.attack, opActive.defense, myActive.element, opActive.element);
    opActive.current_hp = Math.max(0, opActive.current_hp - damage);

    let winner_id: string | null = null;

    if (opActive.current_hp === 0) {
      opActive.defeated = true;
      // Find next non-defeated card for opponent
      const nextIdx = state[opSide].deck.findIndex((c: any, i: number) => i > state[opSide].active_index && !c.defeated);
      if (nextIdx === -1) {
        // Opponent has no cards left — this player wins
        winner_id = user.id;
        await supabase.from("battles").update({ status: "COMPLETED", winner_id, state }).eq("id", battle_id);
        await supabase.from("battle_moves").insert({ battle_id, player_id: user.id, move_type: "ATTACK", attacker_id: myActive.card_id, target_id: opActive.card_id, damage });
        // Award XP
        const loserId = isChallenger ? battle.opponent_id : battle.challenger_id;
        await supabase.rpc("add_xp", { user_id: user.id, amount: 50 });
        await supabase.rpc("add_xp", { user_id: loserId, amount: 10 });
        return new Response(JSON.stringify({ damage, winner_id, state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      state[opSide].active_index = nextIdx;
    }

    // Switch turns
    const nextTurn = isChallenger ? battle.opponent_id : battle.challenger_id;
    await supabase.from("battles").update({ current_turn: nextTurn, state }).eq("id", battle_id);
    await supabase.from("battle_moves").insert({ battle_id, player_id: user.id, move_type: "ATTACK", attacker_id: myActive.card_id, target_id: opActive.card_id, damage });

    return new Response(JSON.stringify({ damage, winner_id, state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Unknown move_type" }), { status: 400, headers: corsHeaders });
});
```

---

## Auth Flow (Step-by-Step)

```
1.  App opens
    → supabase.auth.getSession() checks AsyncStorage for persisted session
    → valid session found? → go to (tabs)/collection
    → no session? → redirect to (auth)/connect

2.  User taps "Connect Wallet"
    → POST supabase.functions.invoke("auth-challenge", { body: { address } })
    → Edge Function inserts nonce into DB (5 min TTL)
    → Returns: { nonce: "Sign in to SolanaCards\nNonce: abc\nTimestamp: 123" }

3.  App calls MWA:
      transact(wallet => wallet.signMessage(encode(nonce)))
    → Phantom opens, user approves
    → Returns: { signature: Uint8Array, publicKey: PublicKey }

4.  App calls:
      POST supabase.functions.invoke("auth-verify", {
        body: { address, signature: bs58.encode(signature), nonce }
      })
    → Edge Function verifies nonce (not expired, not used)
    → Edge Function verifies Ed25519 signature with tweetnacl
    → Edge Function marks nonce used
    → Edge Function upserts user in DB
    → Edge Function signs custom JWT (sub = user.id, role = "authenticated")
    → Returns: { access_token: jwt, user }

5.  App calls:
      await supabase.auth.setSession({
        access_token: jwt,
        refresh_token: ""   // no refresh — wallet re-auth handles this
    → All subsequent supabase.from() queries are now authenticated
    → RLS policies work via auth.uid() = user.id

6.  App navigates to (tabs)/collection
```

---

## NFT Mint Flow (Pack Opening)

```
1.  User taps "Mint Pack"

2.  App calls:
      supabase.functions.invoke("mint-pack", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

3.  Edge Function (for each of 5 cards):
    a. Weighted random rarity pick (60/25/12/3%)
    b. Random template of that rarity
    c. Build metadata JSON with card stats + serial number
    d. Upload metadata to NFT.Storage → ipfs:// URI
    e. Metaplex: mint pNFT with treasury keypair, set tokenOwner = user wallet
    f. Save { mint_address, metadata_uri, serial_number, tx_sig } to cards table
    g. Increment card_templates.total_minted

4.  Returns: { cards: Card[5] }

5.  App: plays pack-opening animation (Reanimated 4 flip/reveal)

6.  App: Zustand store updates cards array → collection screen refreshes automatically
```

---

## Battle System

### Battle Mechanics

| Concept          | Rule                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Deck size        | 3 cards per player, chosen from owned collection before each battle                      |
| Turn structure   | Challenger goes first; turns alternate                                                    |
| Attack formula   | `damage = max(1, floor(attacker.attack × element_mult − defender.defense))`              |
| Element advantage| Attacker gets ×1.5 multiplier when hitting a weak element (see table below)              |
| Defeat           | Card HP reaches 0 → next card in deck becomes active automatically                       |
| Victory          | All 3 opponent cards defeated → winner gets +50 XP, loser gets +10 XP                   |
| Forfeit          | Either player can forfeit at any time; opponent wins                                      |

### Element Advantage Table

| Attacker  | Weak against  |
| --------- | ------------- |
| FIRE      | AIR           |
| AIR       | EARTH         |
| EARTH     | WATER         |
| WATER     | FIRE          |
| LIGHTNING | (neutral)     |
| SHADOW    | (neutral)     |

### Battle Flow (Step-by-Step)

```
1.  User opens Battle tab → sees list of OPEN challenges + "Create Battle" button

2.  User taps "Create Battle"
    → DeckPicker modal opens (select 3 cards from collection)
    → POST supabase.functions.invoke("battle-challenge", { body: { deck: [id1, id2, id3] } })
    → Edge Function validates ownership, builds initial state JSONB, inserts battles row
    → Returns: { battle }
    → App navigates to battle/[id].tsx — shows "Waiting for opponent..."

3.  Another user sees the OPEN battle in Battle tab
    → Taps "Join"
    → DeckPicker modal opens for opponent
    → POST supabase.functions.invoke("battle-accept", { body: { battle_id, deck: [...] } })
    → Edge Function sets opponent_deck, builds full state, sets status = ACTIVE, current_turn = challenger
    → Both players' Supabase Realtime subscription fires → both see the arena

4.  Real-time sync (both devices):
    → supabase.channel("battle:<id>").on("postgres_changes", { table: "battles", filter: "id=eq.<id>" }, ...)
    → Any change to battles.state or battles.current_turn instantly updates both UIs

5.  Challenger's turn:
    → Sees active card vs opponent active card
    → Taps "Attack"
    → POST supabase.functions.invoke("battle-move", { body: { battle_id, move_type: "ATTACK" } })
    → Edge Function computes damage with element multiplier
    → Updates battles.state (HP deducted) + battles.current_turn = opponent_id
    → Inserts battle_moves row for log/replay
    → Realtime fires → opponent UI shows damage animation + updated HP

6.  Repeat turns until one player's 3 cards are all defeated

7.  Battle ends:
    → Edge Function sets status = COMPLETED, winner_id
    → Both UIs receive the final state via Realtime
    → Winner screen shown with XP gained
    → Both players can return to Battle tab to start another battle
```

### `hooks/useBattle.ts` — Key responsibilities

```typescript
// Subscribes to Supabase Realtime channel for a battle
// Exposes: battleState, currentTurn, isMyTurn, submitMove(), forfeit()
// Uses Zustand slice for local optimistic HP updates between server confirmations
```

---

## Implementation Phases

### Phase 0 — External Setup (before writing any code)

- [ ] **Supabase**: Create new project at supabase.com → copy `Project URL` and `anon key`
- [ ] **Supabase CLI**: `npm i -g supabase && supabase login && supabase link --project-ref <ref>`
- [ ] **EAS**: Create Expo account → `npm i -g eas-cli && eas login && eas build:configure`
- [ ] **Treasury keypair**: `solana-keygen new -o treasury.json`
- [ ] **Fund treasury**: `solana airdrop 2 <pubkey> --url devnet` (repeat if needed)
- [ ] **NFT.Storage**: Create account at nft.storage → get API key
- [ ] **Supabase secrets** (for Edge Functions):
  ```bash
  supabase secrets set TREASURY_PRIVATE_KEY="[1,2,3,...,64]"
  supabase secrets set NFTSTORAGE_API_KEY="eyJ..."
  supabase secrets set SOLANA_RPC_URL="https://api.devnet.solana.com"
  # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
  # are injected automatically into Edge Functions
  ```
- [ ] **App `.env`**:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```

### Phase 1 — Database Setup

- [ ] Write `supabase/migrations/001_init.sql` (full schema + RLS shown above)
- [ ] Run: `supabase db push` or `supabase migration up`
- [ ] Seed card templates: insert 15–20 rows in `card_templates` via Supabase Studio
- [ ] Verify: open Supabase Studio → confirm all tables exist with correct columns + RLS on

### Phase 2 — Edge Functions: Auth

- [ ] Write `supabase/functions/auth-challenge/index.ts` (as shown above)
- [ ] Write `supabase/functions/auth-verify/index.ts` (as shown above)
- [ ] Deploy: `supabase functions deploy auth-challenge && supabase functions deploy auth-verify`
- [ ] Verify: test with curl:
  ```bash
  curl -X POST https://xxxx.supabase.co/functions/v1/auth-challenge \
    -H "Content-Type: application/json" \
    -d '{"address":"<any-base58-pubkey>"}'
  # Should return { nonce: "Sign in to SolanaCards\nNonce: ..." }
  ```

### Phase 3 — Edge Function: Mint Pack

- [ ] Write `supabase/functions/mint-pack/index.ts` (as shown above)
- [ ] Deploy: `supabase functions deploy mint-pack`
- [ ] Verify: test with a valid JWT + confirm new row in `cards` table + confirm on solscan.io/devnet

### Phase 4 — Edge Function: Marketplace Buy

- [ ] Write `supabase/functions/marketplace-buy/index.ts`
  - Validate buyer has enough SOL (getBalance check)
  - Update listing status to SOLD
  - Transfer NFT on-chain: `metaplex.nfts().transfer()`
  - Update `cards.owner_id` to buyer
  - Return updated card + listing
- [ ] Deploy: `supabase functions deploy marketplace-buy`

### Phase 5 — Mobile Foundation

- [ ] Update `app.json`: add `android.package`, `scheme: "solanacard"`, intent filters
- [ ] Create `index.js` (polyfills first)
- [ ] Create `polyfills.ts`
- [ ] Run `npx expo prebuild --platform android` → generates `/android` folder
- [ ] Install all mobile packages (see package installs above)
- [ ] Create `constants/config.ts`
- [ ] Create `lib/supabase/client.ts` (with MMKV adapter)
- [ ] Create `lib/solana/connection.ts`
- [ ] Create `types/index.ts`
- [ ] Update `app/_layout.tsx` with Zustand providers (no QueryClientProvider needed)
- [ ] Verify: `npm run android` → app opens on emulator, no crashes

### Phase 6 — Wallet + Auth Flow (Mobile)

- [ ] Write `hooks/useAuthorization.ts`
  - `connect()`: MWA `transact()` → get publicKey + authToken → call Edge Functions → `supabase.auth.setSession()`
  - `disconnect()`: MWA deauthorize → `supabase.auth.signOut()` → clear AsyncStorage
  - Store MWA reauthorization token in AsyncStorage for silent re-auth on app restart
- [ ] Write `app/(auth)/connect.tsx` — connect wallet button + loading state
- [ ] Update `app/index.tsx` — redirect based on `supabase.auth.getSession()`
- [ ] Verify: full login flow on Android emulator with Phantom installed

### Phase 7 — Collection UI

- [ ] Write `app/(tabs)/_layout.tsx` (3 tabs: Collection, Marketplace, Profile)
- [ ] Write `components/cards/CardItem.tsx` (card face with rarity glow effect)
- [ ] Write `app/(tabs)/collection.tsx`
  - `useCards` hook (Zustand) → `supabase.from("cards").select("*, template:card_templates(*)").eq("owner_id", userId)`
  - FlatList grid (numColumns=2), pull-to-refresh, empty state ("Mint your first pack!")
- [ ] Write `app/card/[id].tsx` — full art, stats table, "List for Sale" button
- [ ] Verify: minted cards show in collection, tap opens detail

### Phase 8 — Marketplace UI

- [ ] Write `app/(tabs)/marketplace.tsx`
  - `supabase.from("listings").select("*, card:cards(*, template:card_templates(*)), seller:users(*)").eq("status","ACTIVE")`
  - FlatList, buy button → calls `marketplace-buy` Edge Function
  - Optimistic update via Zustand store
- [ ] Add "List for Sale" modal in card detail screen
  - Creates listing row: `supabase.from("listings").insert(...)` + update `cards.is_listed = true`
- [ ] Verify: end-to-end buy/sell between two test wallets on devnet

### Phase 9 — Battle System

#### Database
- [ ] Add `battles` and `battle_moves` tables + RLS policies to `supabase/migrations/001_init.sql` (schema above)
- [ ] Add `add_xp` SQL function (called by Edge Functions to increment user XP safely):
  ```sql
  CREATE OR REPLACE FUNCTION add_xp(user_id UUID, amount INTEGER)
  RETURNS VOID AS $$ BEGIN
    UPDATE users SET xp = xp + amount WHERE id = user_id;
  END; $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- [ ] Run: `supabase db push`

#### Edge Functions
- [ ] Write `supabase/functions/battle-challenge/index.ts` (as shown above)
- [ ] Write `supabase/functions/battle-accept/index.ts` (as shown above)
- [ ] Write `supabase/functions/battle-move/index.ts` (as shown above)
- [ ] Deploy: `supabase functions deploy battle-challenge battle-accept battle-move`

#### Mobile
- [ ] Write `hooks/useBattle.ts`
  - Subscribe to `supabase.channel("battle:<id>")` for real-time state sync
  - `submitMove(move_type)` → calls `battle-move` Edge Function
  - `forfeit()` → calls `battle-move` with `{ move_type: "FORFEIT" }`
  - Zustand slice: optimistic HP update before server confirms
- [ ] Write `components/battle/DeckPicker.tsx` — bottom sheet to pick 3 cards from collection
- [ ] Write `components/battle/BattleCard.tsx` — card with animated HP bar (Reanimated 4)
- [ ] Write `components/battle/BattleArena.tsx` — two-sided field layout
- [ ] Write `components/battle/MoveLog.tsx` — scrollable feed of moves + damage
- [ ] Write `components/battle/ElementBadge.tsx` — element icon + advantage indicator
- [ ] Update `app/(tabs)/_layout.tsx` — add 4th Battle tab
- [ ] Write `app/(tabs)/battle.tsx`
  - List OPEN battles (`supabase.from("battles").select(...).eq("status","OPEN")`)
  - Pull-to-refresh
  - "Create Battle" button → DeckPicker → calls `battle-challenge`
  - "Join" button per open battle → DeckPicker → calls `battle-accept` → navigate to `battle/[id]`
- [ ] Write `app/battle/[id].tsx`
  - Uses `useBattle(id)` hook
  - Shows BattleArena with live HP updates
  - "Attack" button (disabled when not your turn)
  - "Forfeit" button
  - Victory/defeat overlay when `status === COMPLETED`
- [ ] Verify: two Android emulators running simultaneously, full battle completes end-to-end

### Phase 10 — Profile + Polish

- [ ] Write `app/(tabs)/profile.tsx` — avatar, XP bar, level, card count, battle record (wins/losses), disconnect button
- [ ] Add pack-opening animation (Reanimated 4: card flip reveal, one card at a time)
- [ ] Add battle damage animations in BattleCard (HP bar slide, shake on hit)
- [ ] Add loading skeletons on collection, marketplace, and battle screens
- [ ] Add `ErrorBoundary` in root `_layout.tsx`
- [ ] Verify: no unhandled states anywhere in the app

### Phase 11 — EAS Build + Device Testing

- [ ] Create `eas.json` (as shown above)
- [ ] `eas build --platform android --profile preview` → download APK
- [ ] Install APK on physical Android device
- [ ] Test complete flow: wallet connect → mint pack → view collection → list card → buy card → battle
- [ ] Verify Realtime battle sync on two physical devices with real Phantom app

### Phase 12 — Hackathon Submission

- [ ] Record demo video (2–3 min: connect wallet → mint → collection → marketplace → battle)
- [ ] Write README: description, APK install instructions, architecture diagram
- [ ] Submit to Solana dApp Store (`eas build --profile production` for AAB + store metadata)
- [ ] Submit to hackathon portal with GitHub repo + demo video

---

## Breaking Points + Fixes

| Risk                       | Symptom                                            | Fix                                                                                               |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Polyfill load order        | `crypto.getRandomValues is not a function`         | `import "./polyfills"` MUST be line 1 of `index.js`                                               |
| MWA in Expo Go             | Wallet adapter fails silently                      | Must use dev client build — `eas build --profile development`                                     |
| BigInt serialization       | `TypeError: Do not know how to serialize a BigInt` | Convert lamports to string: `lamports.toString()` before any JSON.stringify                       |
| AsyncStorage size limits   | Silent data loss on large values                   | AsyncStorage has a 6MB default limit on Android — fine for session tokens, not for bulk data      |
| MWA session expiry         | Wallet ops fail after ~24h                         | Store MWA reauth token in AsyncStorage, call `wallet.reauthorize()` before each transact          |
| Supabase session expiry    | supabase.from() returns 401 after 7 days           | Call `supabase.auth.signOut()` + redirect to connect screen on session error                      |
| Edge Function cold start   | First request after idle is slow (~500ms)          | Acceptable for hackathon; in prod use `--no-verify-jwt` flag for public functions                 |
| Deno npm: compat           | Some npm packages fail in Deno with `npm:` prefix  | `@metaplex-foundation/js` (legacy) has better Deno compat than UMI; use it in Edge Functions      |
| RPC rate limits            | `429 Too Many Requests` from devnet                | Use `getConnection()` singleton; add 500ms delay + exponential backoff on retry                   |
| Tx never confirms          | Silent timeout on mint                             | Always use `connection.confirmTransaction(sig, "confirmed")` with max 3 retries                   |
| NFT.Storage limits         | Upload returns null CID                            | Check free tier quota; cache uploaded URIs to never re-upload same metadata                       |
| Metaplex version conflicts | TypeScript errors across packages                  | Pin ALL `@metaplex-foundation/*` packages to exact same minor version                             |
| New Arch incompatibility   | Native module crash on startup                     | Verify each lib's New Arch support; `@react-native-async-storage/async-storage` supports New Arch |
| Intent filter missing      | MWA callback fails, app not found                  | `scheme` in `app.json` must exactly match `APP_IDENTITY.uri` scheme                               |
| RLS blocks Edge Functions  | DB queries return empty/403                        | Edge Functions must use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS), never anon key                |
| Realtime not firing        | Battle state never updates on opponent device      | Enable Realtime on `battles` table in Supabase Dashboard (Table Editor → Realtime toggle)         |
| Race condition on moves    | Two players submit simultaneously, state corrupts  | Edge Function reads + writes `battles.state` in a single `UPDATE … WHERE current_turn = user_id`  |
| JSONB state grows large    | Slow reads after many moves                        | State JSONB only holds current HP/active — full history is in `battle_moves` (append-only)       |
| Realtime channel cleanup   | Memory leak if user navigates away mid-battle      | Always call `supabase.channel().unsubscribe()` in `useBattle` cleanup effect                      |
| Deck cards in marketplace  | Card listed for sale used in active battle         | Check `cards.is_listed = false` before allowing it in deck picker                                 |

---

## Environment Variables Reference

### App root `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Edge Function Secrets (set via CLI — never in code)

```bash
supabase secrets set TREASURY_PRIVATE_KEY="[1,2,3,...,64]"
supabase secrets set NFTSTORAGE_API_KEY="eyJ..."
supabase secrets set SOLANA_RPC_URL="https://api.devnet.solana.com"
# Auto-injected by Supabase — you do NOT set these manually:
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
```

---

## Useful Commands Reference

```bash
# ── Supabase ──────────────────────────────────────────────
supabase start                               # local dev stack (Docker required)
supabase db push                             # push migrations to remote project
supabase functions deploy <name>             # deploy a single edge function
supabase functions deploy --all              # deploy all edge functions
supabase functions serve                     # run functions locally for testing
supabase secrets set KEY=value               # set edge function secret
supabase logs --function <name>              # tail function logs

# ── Solana ────────────────────────────────────────────────
solana-keygen new -o treasury.json           # generate treasury keypair
solana airdrop 2 <PUBKEY> --url devnet       # fund treasury on devnet
solana balance <PUBKEY> --url devnet         # check balance
# Verify a mint: https://solscan.io/token/<MINT_ADDRESS>?cluster=devnet

# ── EAS Build ─────────────────────────────────────────────
eas build --platform android --profile development  # dev client APK
eas build --platform android --profile preview      # shareable APK
eas build --platform android --profile production   # Play Store AAB
eas build:list                                       # list recent builds
eas submit --platform android                        # submit to Play Store

# ── Expo ──────────────────────────────────────────────────
npx expo prebuild --platform android         # generate /android folder
npx expo prebuild --clean                    # full clean regenerate
npm run android                              # start dev server + launch on emulator
npm run lint                                 # run ESLint
```
