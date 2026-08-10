# EstateX

**International AI real-estate platform.** Buy and sell property worldwide, bid in live auctions, and own fractional shares of premium real estate — all through one glass-dark, auction-house experience.

EstateX is a full-stack monorepo: a Next.js web app, a Socket.IO + BullMQ realtime layer, and a shared core package (Prisma data model, ledger-safe wallet, and domain services). An AI concierge (Claude) answers listing questions, drafts property listings, runs valuation comps, and makes buyer matches.

> **Status:** Milestones M0–M5 complete. Local runtime E2E verified (DB, Redis, Socket.IO, BullMQ, web, auth, Stripe test checkout). **28/28 automated tests pass.**

## Highlights

- 🏠 **Property marketplace** — browse, filter, and manage listings in any country
- 🔨 **Live auctions** — real-time bidding with anti-sniping (auto-extend) and instant outbid notifications
- 📊 **Fractional house shares** — buy units of a property, hold a ledger-verified stake, receive dividends
- 💰 **Simulated wallet** — integer-cents ledger with `available`/`reserved` split, funded via Stripe test checkout
- 🤖 **AI concierge** — chat with tool-use over your listings, AI-generated listing drafts, valuation comps, and personalized recommendations (degrades gracefully without an API key)
- 🔐 **Auth** — credentials + JWT with role claims, plus optional Google OAuth
- 🌃 **"Midnight Skyline" design system** — dark navy glass, champagne-gold accents, dossier-style cards

## Tech Stack

| Layer | Technology |
|---|---|
| **Web** | Next.js 16 (App Router, React 19, Turbopack), Tailwind CSS 4, zod 4 |
| **Realtime** | Socket.IO 4.8, ioredis 6, BullMQ 6 |
| **Data** | Prisma 7 + `@prisma/adapter-pg`, PostgreSQL 18, Redis 7 |
| **Auth** | next-auth 4.24 (credentials + JWT + optional Google OAuth) |
| **AI** | `@anthropic-ai/sdk` (Claude) — multi-provider ready (Anthropic, Gemini, Groq, OpenRouter) |
| **Money** | Stripe 22 (test mode), integer-cent wallet |
| **Runtime** | Node.js 24 LTS, TypeScript, pino (structured JSON logs), vitest |

## Architecture

```
npm workspaces
├── apps/web        # Next.js app: UI, Server Actions, AI integration
├── apps/socket     # Socket.IO event relay + BullMQ workers (auctions, dividends)
└── packages/core   # Prisma schema + generated client, zod contracts,
                    # wallet / property / auction / shares services, money & password utils
```

- **PostgreSQL is the source of truth**; the socket process is a stateless event relay. No business logic lives in the socket layer.
- **Money is integer cents** (PostgreSQL `BIGINT`). Wallets split funds into `available` and `reserved` to back auction holds.
- **Ledger invariant:** `sum(equity txs) == available + reserved`. Internal transfers (`AUCTION_RESERVE` / `AUCTION_RELEASE`) are excluded; `AUCTION_WIN_DEBIT` records a negative (equity-reducing) entry.
- **Concurrency:** auctions, asks, and dividends serialize via row locks (`SELECT … FOR UPDATE`); wallet ops use conditional `UPDATE … WHERE` for atomic double-spend protection.
- **One Redis** backs both BullMQ queues and the pub/sub relay.

### Domain model

`User`, `Property`, `PropertyImage`, `Auction`, `Bid`, `Wallet`, `WalletTransaction`, `ShareProgram`, `ShareAsk`, `ShareHolding`, `Dividend`, `DividendPayout`, `AiListingDraft`, `ChatMessage`.

## Getting Started

Requires: **Node.js ≥ 24**, **Docker** (for Postgres + Redis).

### 1. Install & configure

```bash
git clone <repo-url>
cd real-estate-platform
npm install

# Copy env templates
cp apps/web/.env.example        apps/web/.env.local
cp apps/socket/.env.example     apps/socket/.env
```

Set at minimum `NEXTAUTH_SECRET` (and `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, Stripe keys if you want those features). See `apps/web/.env.example` for every variable.

### 2. Start the database

```bash
docker compose up -d postgres redis
```

Postgres runs on host port **5434** and Redis on **6380** (kept free of any other local projects).

### 3. Migrate, seed, run

```bash
npm run db:migrate   # apply the initial migration
npm run db:seed      # demo users + 3 properties + a share program

npm run dev          # web (http://localhost:3000) + socket (:3001)
```

Or run them separately with `npm run dev:web` / `npm run dev:socket`.

### 4. Demo accounts

| Account | Email | Password |
|---|---|---|
| Buyer | `buyer@estatex.demo` | `estatex-demo-123` |
| Seller | `seller@estatex.demo` | `estatex-demo-123` |

The buyer wallet is pre-funded with **$1,500,000.00**.

> Google sign-in requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (see `TESTING.md` §9 for OAuth setup).

### Docker (full stack)

`docker compose up --build` runs postgres, redis, web (port 3000), and socket (port 3001) together.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing — the "live floor" with featured lot + market board |
| `/properties` · `/properties/[id]` · `/properties/new` | Browse, view, and list properties |
| `/auctions/[id]` · `/auctions/new` | Live auction room; open a listing for auction |
| `/shares/[id]` · `/shares/new` | Fractional share program; start one |
| `/wallet` | Ledger, balance, Stripe wallet funding |
| `/chat` | AI concierge |
| `/recommendations` | Personalized matches |
| `/login` · `/register` | Auth |
| `/health` | Web health check (socket: `:3001/health`) |

### API

`/api/auth/[...nextauth]` · `/api/wallet/fund` · `/api/stripe/webhook` · `/api/uploads` · `/api/chat`

## System Flow

1. **User journey** — register (scrypt-hashed password) → wallet auto-created → fund via Stripe test checkout or the dev seed → browse properties / live auctions / share lots.
2. **Live auction** — bid (HTTP) → Prisma transaction (validate increment, reserve funds, anti-sniping extend, outbid release) → Redis pub/sub → Socket.IO room broadcast → BullMQ `auction:end` job → settlement (refund outbid, debit winner, mark property SOLD).
3. **House shares** — seller posts a share ask → buyer buys at ask → holdings ledger + wallet credit/debit → BullMQ `dividend:payout` job credits all holders.
4. **AI concierge** — tool-use chat over listing/share data, listing drafts, valuation comps, buyer matching.

## Testing

```bash
npm run typecheck   # tsc --noEmit across all workspaces
npm test            # vitest: 28 tests (16 unit + 12 DB integration)
```

The DB integration tests cover wallet reserve/release/settle, auction bid → settle → SOLD, and shares buy → dividend payout. They need Postgres + Redis running.

`TESTING.md` has a full manual browser walkthrough with expected results for every surface.

## Deploying

- **Web app** → deploy to **Vercel**. `vercel.json` is ready (`next build` on `@estatex/web`). Set env vars from `apps/web/.env.example` (hosted Postgres/Redis, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, Stripe keys).
- **Socket + BullMQ workers** → these are long-lived processes and cannot run on serverless; deploy to an always-on host (Fly.io / Railway / Render) and point `NEXT_PUBLIC_SOCKET_URL` + `REDIS_URL` at it.

## Roadmap

- [ ] Real-money rails: escrow, KYC/AML, Stripe production, multi-currency FX
- [ ] Share order-book / bid-ask matching engine (MVP is an ask-price market)
- [ ] Horizontal socket scaling (ioredis Socket.IO adapter)
- [ ] Email verification, 2FA
- [ ] Viewings scheduling, document vault, legal e-sign
- [ ] APT/OTel tracing, Prometheus metrics
- [ ] i18n + per-country listing validation / regulatory fields
- [ ] Client-side Stripe card element

## License

Private project — all rights reserved.
