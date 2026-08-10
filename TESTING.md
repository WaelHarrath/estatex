# EstateX — Manual Test Scenario

A step-by-step walkthrough you can run by hand in a browser to verify the whole platform.
Target: `http://localhost:3000` (dev). Screenshots of every surface are in `screenshots/`.

---

## 0. Stack health (before you start)

| Check | URL / command | Expect |
|---|---|---|
| Web | http://localhost:3000/health | `200` |
| Socket | http://localhost:3001/health | `200` |
| Postgres | `docker ps` → `real-estate-platform-postgres-1` | `Up ... (healthy)` on 5434 |
| Redis | `docker ps` → `real-estate-platform-redis-1` | `Up ... (healthy)` on 6380 |

If anything is down: start Docker Desktop, wait for engine, then
`docker compose up -d postgres redis` from the repo root, and start
`npm run dev -w @estatex/web` plus `node apps/socket/dist/index.js` (from `apps/socket`).

## 1. Demo accounts

| Account | Email | Password | Notes |
|---|---|---|---|
| Buyer | `buyer@estatex.demo` | `estatex-demo-123` | Wallet pre-funded **$1,500,000.00** |
| Seller | `seller@estatex.demo` | `estatex-demo-123` | Owns seeded properties |

> Google sign-in: the "Continue with Google" button only appears after you set
> `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `apps/web/.env.local` and restart
> the web server (see §9 for the OAuth setup).

---

## 2. Home — the live floor

1. Open **http://localhost:3000/**.
   - **Expect:** dark navy "Midnight Skyline" look. Hero shows the featured lot
     (Villa Serene, whose auction is LIVE) over a property photograph.
   - **Expect:** gold mono eyebrow `LOT 01 · …`, large display headline, two buttons
     (**Enter the room** / **Browse all lots**).
   - **Expect:** glass live panel — pulsing gold dot, `THE FLOOR IS OPEN`, current bid,
     live countdown, next minimum bid.
2. Scroll to **Market board** → 3 dossier cards. Each card: gold keyline top, corner
   brackets, image, `LOT 0N` chip, state chip (LIVE/SHARES/SALE), mono spec strip
   (SQFT · BEDS · BATHS), gold price. Hover → lift + gold glow.
3. Scroll to **How the floor works** → 3 glass panels with gold keyline (Live auctions /
   House shares / AI concierge) — no numbered markers.
4. Scroll to the **footer** → business description, market links, contact block
   (Email / Phone / Post / hours), copyright bar.

## 3. Browse properties

1. Click **Properties** in the header (or hero **Browse all lots**).
   - **Expect:** eyebrow `THE BOARD`, title, gold **List a property** button.
2. Click a property card → property dossier page.
   - **Expect:** dark glass detail page with image, price, specs, and — for Villa Serene —
     an **AI valuation** card and a **Shares** link.

## 4. Sign in (credentials)

1. Header → **Sign in** (or http://localhost:3000/login).
   - **Expect:** glass card with gold keyline + corner brackets, gold **Sign in** button,
     "or continue with Google" divider (Google button only if configured).
2. Login as buyer:
   - Email `buyer@estatex.demo`, password `estatex-demo-123`, click **Sign in**.
   - **Expect:** redirect to `/properties`, header now shows **Wallet · For you · Concierge**
     and the buyer's name.
3. **Negative test:** log out, log in with a wrong password → red error
   `Invalid email or password`, stays on `/login`.

## 5. Wallet

1. Header → **Wallet** (http://localhost:3000/wallet).
   - **Expect:** balance **$1,500,000.00** (ledger mono figures), transaction history,
     a **Fund wallet** button that opens Stripe test checkout.
2. Not signed in, visiting `/wallet` → redirects to `/login` (`307`).

## 5b. Stripe wallet funding (test mode)

Stripe test keys are configured in `apps/web/.env.local`:
`STRIPE_SECRET_KEY=sk_test_...` (server) + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
(reserved for client-side card flows — not used yet).

1. Signed in as buyer → **Wallet** → **Fund wallet** → enter an amount.
   - **Expect:** redirect to `checkout.stripe.com` (test mode) with a card form.
     Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
2. **Webhook (wallet credit):** the webhook endpoint
   `POST http://localhost:3000/api/stripe/webhook` requires `STRIPE_WEBHOOK_SECRET`.
   To test the full fund loop, run the Stripe CLI:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   then copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `apps/web/.env.local`,
   restart web, and repeat step 1 — on `checkout.session.completed` the wallet balance
   credits via the webhook.
3. **Negative:** webhook POST without a `stripe-signature` header → `400`; with the
   wrong secret → `400 Invalid signature`. The fund route with no key returns `501`.

## 6. Live auction

1. Header → **Concierge** is for chat; the live auction for Villa Serene:
   **http://localhost:3000/auctions/cmshesxnx0000skutl4l1jkiu** (or from the home hero → **Enter the room**).
   - **Expect:** auction room with live countdown, current bid, bid input (increment
     respected), anti-sniping note, real-time updates (socket).
2. Place a bid above the minimum → bid registers, outbid messages appear on refresh,
   and a reserve hold appears in the wallet (`reserved`). You can also see the same
   room in a second browser tab for live sync.
3. Create your own: **Sell → List a property** → after listing, **auctions/new** lets you
   open it for auction.

## 7. House shares

1. From Villa Serene's property page, click the **Shares** link →
   **http://localhost:3000/shares/cmshbic6w000axcut9ttq50uc**.
   - **Expect:** share program page: total shares, price/share, open asks, buy form.
2. Buy shares as buyer → wallet debits, holdings appear; a `dividend:payout` job pays
   holders when the seller triggers a dividend.

## 8. AI concierge

1. Header → **Concierge** (http://localhost:3000/chat).
   - **Expect:** chat panel. Without `ANTHROPIC_API_KEY` it replies with a graceful
     "not configured" message; with a key it answers listing questions with tools.
2. **Recommendations** (http://localhost:3000/recommendations) → personalized lots.

## 9. Google sign-in (after configuring OAuth)

1. Google Cloud Console → Credentials → Create **OAuth client ID** (type *Web application*).
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
2. In `apps/web/.env.local`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
3. Restart the web dev server. The **Continue with Google** button now appears on
   `/login` and `/register`.
4. Click it → Google consent → you land on `/properties` signed in. First-time Google
   users are auto-provisioned a BUYER account + empty wallet.

## 10. Regression sweep (fast)

| Route | Signed out | Signed in |
|---|---|---|
| `/` | 200 | 200 |
| `/properties` | 200 | 200 |
| `/properties/[id]` | 200 | 200 |
| `/login`, `/register` | 200 | — |
| `/wallet`, `/chat`, `/recommendations`, `/auctions/new`, `/shares/new` | 307 → login | 200 |
| `/health` (web), `:3001/health` (socket) | 200 | 200 |
