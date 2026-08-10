# PROJECT_MAP — EstateX: International AI Real-Estate Platform

> Live status: **M0–M5 complete. Full local runtime E2E verified (DB, Redis, Socket.IO, BullMQ, web, auth). Frontend redesigned ("Midnight Skyline" — dark navy glass + champagne gold) with full depth pass + footer/contact. Google OAuth wired (creds set). Stripe test keys set — real checkout session verified; webhook secret pending.** Vercel deploy of web app pending account auth. Manual test script: `TESTING.md`. Screenshots: `screenshots/`.

## [TECH_STACK]
- **Web:** Next.js 16.3.0 (App Router, React 19.2.8, Turbopack, Tailwind 4.3.3) · TypeScript 7.0.2 · zod 4.4.3
- **Realtime:** Socket.IO 4.8.3 (event relay) · socket.io-client · ioredis 6.0.0 (named import) · BullMQ 6.0.8
- **Data:** Prisma 7.9.1 + @prisma/adapter-pg (driver adapter, ESM, prisma.config.ts, generated to `packages/core/generated`) · PostgreSQL 18 · Redis 7
- **Auth:** next-auth 4.24.15 (credentials + JWT, role claim) + Google OAuth (opt-in: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`; auto-provisions BUYER account + wallet on first sign-in)
- **UI:** Tailwind 4 design tokens in `apps/web/app/globals.css` — "Midnight Skyline" palette (`abyss` navy, `porcelain` text, `gold` champagne accent, `azure` live, `ember` error). Legacy token names (`paper`/`ink`/`cadastral`/`stamp`/`hairline`) aliased to new values so all pages restyle in place. Fonts: Space Grotesk (display) · Manrope (body) · IBM Plex Mono (figures). Signature: glass dossier cards with gold keyline + corner brackets.
- **AI:** @anthropic-ai/sdk 0.115.0 (Claude; `AI_MODEL` env, default claude-sonnet-5) — degrades gracefully without API key
- **Money:** stripe 22.4.0 (test mode) — simulated integer-cents wallet. Test keys set in `apps/web/.env.local` (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`); `STRIPE_WEBHOOK_SECRET` still empty (needs `stripe listen`)
- **Runtime:** Node 24 LTS · pino 10.3.1 (async JSON) · pino-http 11.0.0 · vitest 4.1.10
- **Supporting:** dotenv 17.4.2 · pg 8.22.0 · tsx 4.23.8 · @types/node 26.1.2
- **Infra:** npm workspaces (`apps/web`, `apps/socket`, `packages/core`) · Docker Compose (postgres, redis, web, socket) · vercel.json

## [LOCAL_DEV]
- **Ports:** Postgres **5434** (5432/5433 taken by other projects), Redis **6380**, web 3000, socket 3001. Set in `packages/core/.env`, `apps/web/.env.local`, `apps/socket/.env` (+ `.env.example` copies).
- **Boot:** `docker compose up -d postgres redis` → `npm run db:migrate` (creates `init` migration) → `npm run db:seed`.
- **Run:** `npm run dev -w @estatex/web` + `node apps/socket/dist/index.js` (build socket first: `npm run build -w @estatex/socket`).
- **Demo users:** `buyer@estatex.demo` / `seller@estatex.demo` / password `estatex-demo-123`. Buyer funded $1.5M. Seed: 3 properties, share program on first.

## [SYSTEM_FLOW]
1. **User journey:** register (scrypt-hashed password) → wallet auto-created → fund via Stripe test checkout or dev seed → browse properties / live auctions / share lots.
2. **Live auction:** bid (HTTP) → Prisma transaction (validate increment, reserve funds, anti-sniping extend, outbid release) → Redis pub/sub (`events:auction`) → Socket.IO room broadcast → BullMQ `auction:end` job → settlement (refund outbid, winner reserve→debit, property SOLD).
3. **House shares:** seller posts share ask → buyer buys at ask → holdings ledger + wallet credit/debit → BullMQ `dividend:payout` job credits all holders.
4. **AI concierge:** chat with tool-use over listing/share data; listing-gen drafts; valuation comps; buyer matching.

## [ARCHITECTURE]
- npm workspace: `apps/web` (UI, Server Actions, AI) + `apps/socket` (Socket.IO + BullMQ workers) + `packages/core` (Prisma schema/client, zod contracts, money/password/logger, wallet/property/auction/shares services).
- **Postgres is the source of truth; the socket process is a stateless event relay.** No business logic in the socket layer.
- Money = integer cents (Postgres BIGINT); `available`/`reserved` wallet split for auction holds.
- **Ledger invariant:** `sum(equity txs) == available + reserved`; `AUCTION_RESERVE`/`AUCTION_RELEASE` are internal transfers and excluded; `AUCTION_WIN_DEBIT` records negative (equity-reducing). Credits auto-create the wallet row (`applyWalletOp`).
- **Concurrency:** auctions/asks/dividends use row locks (`SELECT ... FOR UPDATE`) to serialize; wallet ops use conditional `UPDATE ... WHERE` for atomic double-spend protection.
- Single Redis for BullMQ queues + pub/sub relay. Docker Compose: `postgres`, `redis`, `web`, `socket`.
- Auth: `/register`, `/login`; guards `requireUser()`/`getCurrentUser()` (`apps/web/src/guards.ts`); JWT carries `id` + `role`.
- Routes: `/properties`, `/properties/[id]`, `/properties/new`, `/auctions/[id]`, `/auctions/new`, `/shares/[id]`, `/shares/new`, `/wallet`, `/chat`, `/recommendations`. API: `/api/auth/[...nextauth]`, `/api/wallet/fund`, `/api/stripe/webhook`, `/api/uploads`, `/api/chat`.

## [VERIFIED] (runtime, live stack)
- Docker: postgres:18 + redis:7 healthy on 5433/6380 ✓
- `prisma migrate dev --name init` applied ✓ · `db:seed` ✓ (2 users, 3 properties, share program)
- **vitest: 28/28 pass** (16 unit + 12 DB integration: wallet reserve/release/settle, auction bid→settle→SOLD, shares buy→dividend payout) ✓
- Socket server: /health ok, auction worker started, subscribed to `events:auction`, BullMQ `bull:auction` + `bull:dividend` queues polling ✓
- Web: /health ok; pages 200 (`/`, `/properties`, `/register`, `/login`); `/chat`+`/recommendations` 307→login ✓
- Auth: CSRF→credentials login→session JWT (id+role) ✓; Google provider wired + jwt upsert (BUYER+wallet) ✓; `/api/chat` 401 unauth, graceful "not configured" reply when authed without key ✓
- Redesign (2026-08-07): tokens flipped to Midnight Skyline; all pages serve on dark palette; hero live panel, dossier cards, glass login/register with Google button (renders only when configured); web tsc ✓; 15 screenshots captured in `screenshots/`
- Depth pass (2026-08-07): property detail + auction pages rebuilt as glass "lot dossier / live room" surfaces; AuctionRoom → glass panel with gold bid desk (btn-primary), ember urgent timer; "How the floor works" numbering replaced with structural dividers; footer added (business description, market links, contact block) via layout; `bg-ink text-white` invisible-button pattern eliminated across chat bubbles, send, and all submit buttons; web tsc ✓
- Wallet page renders $1,500,000.00 ✓; property detail shows AI valuation card + share link ✓; shares page + auction-new page render ✓
- Stripe (2026-08-07): secret key set → `/api/wallet/fund` returns a real `checkout.stripe.com` session URL (created + hosted page loads); publishable key set for future client flows; webhook credit loop pending `STRIPE_WEBHOOK_SECRET` (see TESTING.md §5b)
- Builds: core ✓, socket ✓, web `next build` (all routes, standalone) ✓, web tsc ✓

## [ORPHANS & PENDING]
- [ ] **Vercel deploy** (web app only): connect repo, set env vars from `.env.example` (hosted Postgres/Redis, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`). `vercel.json` ready.
- [ ] **Socket + BullMQ on an always-on host** (Fly.io/Railway/Render) — Vercel serverless cannot host long-lived Socket.IO/workers. Point `NEXT_PUBLIC_SOCKET_URL` + `REDIS_URL` there.
- [ ] Real-money rails: escrow, KYC/AML, Stripe production, multi-currency FX
- [ ] **Stripe webhook secret**: run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET` to complete the fund→credit loop (checkout session creation already verified)
- [ ] Share order-book / bid-ask matching engine (MVP is ask-price market)
- [ ] ioredis Socket.IO adapter + horizontal socket scaling
- [ ] Email verification, 2FA (Google OAuth done)
- [ ] Viewings scheduling, document vault, legal e-sign
- [ ] APT/OTel tracing, Prometheus metrics
- [ ] i18n + per-country listing validation/regulatory fields
- [ ] Client-side Stripe card element (publishable key is set; reserve flows only use server checkout)
- [ ] `.env.local` Google creds present — rotate before any real deployment
