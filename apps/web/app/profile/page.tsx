import Link from "next/link";
import Image from "next/image";
import {
  getWalletBalance,
  listUserHoldings,
  listUserProperties,
  listWalletTransactions,
  type WalletTxType
} from "@estatex/core";
import { requireUser } from "@/src/guards";
import { formatMoney } from "@/src/format";
import Stamp from "@/app/components/Stamp";
import PropertyStatusToggle from "./PropertyStatusToggle";

export const dynamic = "force-dynamic";

const TX_LABEL: Record<WalletTxType, string> = {
  FUND: "Wallet funded",
  AUCTION_RESERVE: "Bid placed on hold",
  AUCTION_RELEASE: "Bid hold released",
  AUCTION_WIN_DEBIT: "Auction won",
  SHARE_PURCHASE: "Bought shares",
  SHARE_SALE: "Sold shares",
  DIVIDEND: "Dividend received",
  ADMIN_ADJUST: "Adjustment"
};

export default async function ProfilePage() {
  const user = await requireUser();
  const [balance, properties, holdings, txs] = await Promise.all([
    getWalletBalance(user.id),
    listUserProperties(user.id),
    listUserHoldings(user.id),
    listWalletTransactions(user.id)
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* ── Account header ───────────────────────────────────── */}
      <div className="glass keyline corner relative overflow-hidden rounded-lg p-6">
        <div className="survey-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="crosshair" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h1 className="mt-2 font-display text-3xl text-porcelain">{user.name}</h1>
            <p className="figure mt-1 text-sm text-porcelain-soft">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <Stamp>{user.role}</Stamp>
              <Stamp tone="cadastral">USD</Stamp>
            </div>
          </div>
          <div className="text-right">
            <p className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-soft">Available</p>
            <p className="figure mt-1 text-4xl font-medium tracking-tight text-gold">
              {formatMoney(BigInt(balance.availableCents))}
            </p>
            <p className="figure mt-2 text-xs tracking-[0.12em] text-porcelain-faint">
              Reserved <span className="text-porcelain-soft">{formatMoney(BigInt(balance.reservedCents))}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── My properties ────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">My properties</h2>
          <Link href="/properties/new" className="btn-ghost !px-3 !py-1.5 !text-xs">
            + New listing
          </Link>
        </div>
        {properties.length === 0 ? (
          <p className="mt-4 border border-hairline bg-panel/50 p-5 text-sm text-porcelain-soft">
            No properties yet. Create your first listing to start an auction or share program.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {properties.map((p) => {
              const cover = p.images[0];
              return (
                <li key={p.id} className="glass keyline rounded-lg p-3">
                  <Link href={`/properties/${p.id}`} className="group block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-abyss-deep">
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt ?? p.title}
                          width={480}
                          height={320}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="survey-grid absolute inset-0" aria-hidden />
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-base text-porcelain group-hover:text-gold-bright">
                      {p.title}
                    </h3>
                    <p className="figure mt-0.5 text-xs text-porcelain-soft">
                      {p.city}, {p.country} · {formatMoney(p.priceCents, p.currency)}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center justify-between">
                    <Stamp tone={p.status === "ACTIVE" ? "stamp" : "ink"}>{p.status}</Stamp>
                    <PropertyStatusToggle propertyId={p.id} status={p.status as "ACTIVE" | "OFF_MARKET"} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── My shares ────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="eyebrow">My shares</h2>
        {holdings.length === 0 ? (
          <p className="mt-4 border border-hairline bg-panel/50 p-5 text-sm text-porcelain-soft">
            No share holdings yet. Browse active share programs to invest.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border border-hairline bg-panel/50">
            {holdings.map((h) => {
              const property = h.program.property;
              const cover = property.images[0];
              const valueCents = BigInt(h.units) * h.program.pricePerShareCents;
              return (
                <li key={h.programId} className="flex items-center gap-4 p-4">
                  <Link href={`/shares/${h.programId}`} className="block">
                    <div className="h-14 w-20 overflow-hidden rounded border border-hairline bg-abyss-deep">
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt ?? property.title}
                          width={80}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="survey-grid h-full w-full" aria-hidden />
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/shares/${h.programId}`} className="font-display text-sm text-porcelain hover:text-gold-bright">
                      {property.title}
                    </Link>
                    <p className="figure mt-0.5 text-xs text-porcelain-soft">
                      {h.units.toLocaleString()} units · {formatMoney(h.program.pricePerShareCents, property.currency)} / unit
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="figure text-sm text-gold">{formatMoney(valueCents, property.currency)}</p>
                    <Link href={`/shares/${h.programId}`} className="figure text-xs text-porcelain-faint hover:text-gold-bright">
                      Manage →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Action history ───────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="eyebrow">Action history</h2>
        {txs.length === 0 ? (
          <p className="mt-4 border border-hairline bg-panel/50 p-5 text-sm text-porcelain-soft">
            No activity yet. Funding your wallet, bidding, and buying shares will appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border border-hairline bg-panel/50">
            {txs.map((tx) => {
              const amount = tx.amountCents;
              const positive = amount >= 0n;
              return (
                <li key={tx.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-porcelain">{TX_LABEL[tx.type] ?? tx.type}</p>
                    <p className="figure mt-0.5 text-xs text-porcelain-faint">
                      {tx.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>
                  <p className={`figure shrink-0 text-sm ${positive ? "text-gold" : "text-porcelain-soft"}`}>
                    {positive ? "+" : "−"}
                    {formatMoney(positive ? amount : -amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
