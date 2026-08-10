import Link from "next/link";
import Image from "next/image";
import { listProperties } from "@estatex/core";
import { formatMoney } from "@/src/format";
import LotCard from "./components/LotCard";
import Stamp from "./components/Stamp";
import Countdown from "./components/Countdown";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const properties = await listProperties();

  const lotNo = new Map(properties.map((p, i) => [p.id, i + 1]));
  const featured = properties.find((p) => p.auction && p.auction.status === "LIVE") ?? properties[0];
  const board = properties.slice(0, 3);

  // ── The atlas: group the active board into markets. ───────────
  const markets = Array.from(
    properties.reduce((map, p) => {
      const entry = map.get(p.country) ?? {
        country: p.country,
        currency: p.currency,
        cities: new Set<string>(),
        lots: 0,
        valueCents: 0n
      };
      entry.cities.add(p.city);
      entry.lots += 1;
      entry.valueCents += p.priceCents;
      map.set(p.country, entry);
      return map;
    }, new Map<string, { country: string; currency: string; cities: Set<string>; lots: number; valueCents: bigint }>())
      .values()
  )
    .map((m) => ({ ...m, cities: Array.from(m.cities) }))
    .sort((a, b) => (a.valueCents > b.valueCents ? -1 : 1));

  const totalValueCents = properties.reduce((sum, p) => sum + p.priceCents, 0n);
  const liveCount = properties.filter((p) => p.auction?.status === "LIVE").length;
  const shareCount = properties.filter((p) => p.shareProgram).length;

  // ── The fractional ledger: live share programs on the floor. ──
  const sharePrograms = properties
    .filter((p) => p.shareProgram)
    .map((p) => ({
      programId: p.shareProgram!.id,
      title: p.title,
      city: p.city,
      country: p.country,
      currency: p.currency,
      issuedShares: p.shareProgram!.issuedShares,
      totalShares: p.shareProgram!.totalShares,
      pricePerShareCents: p.shareProgram!.pricePerShareCents,
      imageUrl: p.images[0]?.url
    }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* ── The live floor ─────────────────────────────────────────
          Hero: the most characteristic moment is a running auction
          over a property photograph, framed as a night dossier. */}
      {featured ? (
        <section className="relative overflow-hidden rounded-xl border border-hairline">
          {/* Backdrop: property photograph under a deep navy scrim. */}
          {featured.images[0]?.url ? (
            <Image
              src={featured.images[0].url}
              alt={featured.images[0].alt ?? featured.title}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          ) : null}
          <div className="survey-grid absolute inset-0 opacity-70" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/20"
            aria-hidden
          />

          <div className="relative flex min-h-[26rem] flex-col justify-end gap-8 p-6 sm:p-12 lg:flex-row lg:items-end">
            <div className="reveal flex-1">
              <p className="eyebrow">
                Lot {String(lotNo.get(featured.id) ?? 1).padStart(2, "0")} ·{" "}
                {featured.city}, {featured.country}
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.95] tracking-tight text-porcelain sm:text-6xl">
                {featured.title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-porcelain-soft">
                {featured.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={featured.auction ? `/auctions/${featured.auction.id}` : `/properties/${featured.id}`}
                  className="btn-primary"
                >
                  {featured.auction ? "Enter the room" : "Inspect the lot"} →
                </Link>
                <Link href="/properties" className="btn-ghost">
                  Browse all lots
                </Link>
              </div>
            </div>

            {featured.auction && featured.auction.status === "LIVE" ? (
              <div className="reveal reveal-delay-1 glass keyline corner w-full shrink-0 rounded-lg p-6 sm:w-96">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="live-dot" aria-hidden />
                    <span className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-soft">
                      The floor is open
                    </span>
                  </span>
                  <Stamp>Live</Stamp>
                </div>
                <dl className="mt-6 space-y-5">
                  <div>
                    <dt className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-soft">
                      Current bid
                    </dt>
                    <dd className="figure mt-1 text-3xl font-medium tracking-tight text-gold-bright">
                      {formatMoney(featured.auction.currentPriceCents, featured.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-soft">
                      Time remaining
                    </dt>
                    <dd className="mt-1">
                      <Countdown
                        endAt={featured.auction.endAt.toISOString()}
                        className="text-2xl font-medium tracking-tight text-azure"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-soft">
                      Next minimum bid
                    </dt>
                    <dd className="figure mt-1 text-xl text-gold">
                      {formatMoney(
                        featured.auction.currentPriceCents + (featured.auction.minIncrementCents ?? 0n),
                        featured.currency
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="reveal reveal-delay-1 glass keyline corner w-full shrink-0 rounded-lg p-6 sm:w-96">
                <Stamp>Quiet</Stamp>
                <p className="mt-4 text-sm leading-relaxed text-porcelain-soft">
                  No auction is running right now. Every lot is available for direct purchase or
                  fractional shares.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="glass keyline rounded-xl p-12 text-center">
          <h1 className="font-display text-4xl font-semibold text-porcelain">No lots on the floor yet.</h1>
          <p className="mt-2 text-sm text-porcelain-soft">List the first property, and the market opens.</p>
        </section>
      )}

      {/* ── The market board ───────────────────────────────────── */}
      {board.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <div>
              <p className="eyebrow">Market board</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-porcelain">On the board</h2>
            </div>
            <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
              Lots {board.length}
            </span>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((property) => (
              <LotCard
                key={property.id}
                lot={{
                  id: property.id,
                  lotNumber: lotNo.get(property.id) ?? 1,
                  title: property.title,
                  city: property.city,
                  country: property.country,
                  sqft: property.sqft,
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms,
                  priceCents: property.priceCents,
                  currency: property.currency,
                  imageUrl: property.images[0]?.url,
                  imageAlt: property.images[0]?.alt,
                  state: property.auction?.status === "LIVE" ? "LIVE" : property.shareProgram ? "SHARES" : "SALE"
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── The atlas ────────────────────────────────────────────
          Coverage board: where the floor is open, grouped by market.
          Real numbers off the live ledger — ranked by floor value,
          so the order carries the meaning. */}
      {markets.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <div>
              <p className="eyebrow">The atlas</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-porcelain">Markets on the ledger</h2>
            </div>
            <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
              {markets.length} markets · {properties.length} lots
            </span>
          </div>

          <div className="glass keyline corner relative mt-8 overflow-hidden">
            <div className="survey-grid absolute inset-0 opacity-40" aria-hidden />
            <span className="crosshair left-8 top-8" aria-hidden />
            <span className="crosshair right-8 bottom-8" aria-hidden />

            <div className="relative divide-y divide-hairline">
              {markets.map((m, i) => (
                <div key={m.country} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span className="figure rounded-md border border-hairline-bright bg-abyss/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-display text-lg font-medium text-porcelain">{m.country}</p>
                      <p className="mt-0.5 text-xs text-porcelain-soft">{m.cities.join(" · ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="figure text-[0.62rem] uppercase tracking-[0.2em] text-porcelain-soft">
                      {m.lots} lot{m.lots === 1 ? "" : "s"}
                    </span>
                    <span className="figure text-lg font-medium tracking-tight text-gold-bright">
                      {formatMoney(m.valueCents, m.currency)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-abyss/50 px-6 py-5">
                <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
                  Total floor value · {liveCount} live auction{liveCount === 1 ? "" : "s"}
                </span>
                <span className="figure text-2xl font-medium tracking-tight text-gold">
                  {formatMoney(totalValueCents, "USD")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── The fractional ledger ─────────────────────────────────
          Real share programs on the floor: issued units and price
          per unit, in ledger mono. Quiet, tabular, exact. */}
      {sharePrograms.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <div>
              <p className="eyebrow">The fractional ledger</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-porcelain">House shares on the floor</h2>
            </div>
            <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
              {sharePrograms.length} program{sharePrograms.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-hairline">
            <div className="grid grid-cols-[minmax(0,1.6fr)_8rem_9rem] items-center gap-4 border-b border-hairline bg-abyss/40 px-6 py-3">
              <span className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-faint">Program</span>
              <span className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-faint">Issued</span>
              <span className="figure text-right text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-faint">Per unit</span>
            </div>
            {sharePrograms.map((p) => (
              <Link
                key={p.programId}
                href={`/shares/${p.programId}`}
                className="group grid grid-cols-[minmax(0,1.6fr)_8rem_9rem] items-center gap-4 border-b border-hairline px-6 py-4 transition last:border-b-0 hover:bg-panel"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {p.imageUrl ? (
                    <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded border border-hairline">
                      <Image src={p.imageUrl} alt={p.title} fill sizes="64px" className="object-cover" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-medium text-porcelain transition group-hover:text-gold-bright">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-xs text-porcelain-soft">
                      {p.city}, {p.country}
                    </p>
                  </div>
                </div>
                <p className="figure text-sm text-porcelain-soft">
                  {p.issuedShares.toLocaleString()} / {p.totalShares.toLocaleString()}
                </p>
                <p className="figure text-right text-sm font-medium text-gold-bright">
                  {formatMoney(p.pricePerShareCents, p.currency)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── The auction protocol ──────────────────────────────────
          How a lot changes hands — a real sequence of moves, so it
          is numbered: reserve the funds, extend the clock, release
          the outbid, settle to the winner. */}
      <section className="mt-20">
        <div className="flex items-end justify-between border-b border-hairline pb-4">
          <div>
            <p className="eyebrow">The auction protocol</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-porcelain">How a lot changes hands</h2>
          </div>
          <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
            Reserve · Anti-snipe · Settle
          </span>
        </div>

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Funds held in reserve",
              body: "Your bid is moved to a reserved hold in your wallet — locked to the lot, never spent."
            },
            {
              step: "02",
              title: "Anti-sniping clock",
              body: "A bid in the final seconds extends the room, so nobody can snipe the lot at the last instant."
            },
            {
              step: "03",
              title: "Outbid, released",
              body: "When someone tops you, your hold is released instantly — your capital is free again."
            },
            {
              step: "04",
              title: "Settle to the winner",
              body: "At close, the winning hold settles and the title moves. Every step is on the ledger."
            }
          ].map((step) => (
            <li key={step.step} className="glass keyline corner relative p-6">
              <span className="figure text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-gold">{step.step}</span>
              <h3 className="mt-4 font-display text-base font-medium text-porcelain">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-porcelain-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── How the floor works ────────────────────────────────── */}
      <section className="mt-20">
        <div className="flex items-end justify-between border-b border-hairline pb-4">
          <div>
            <p className="eyebrow">The house rules</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-porcelain">Three ways onto the floor</h2>
          </div>
          <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
            Pick your market
          </span>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { title: "Live auctions", body: "Real-time bidding with anti-sniping protection on premium lots worldwide." },
            { title: "House shares", body: "Own fractions of income-producing property and receive dividend payouts." },
            { title: "AI concierge", body: "Ask anything about a listing — pricing, comparables, or the auction rules." }
          ].map((f) => (
            <article key={f.title} className="glass keyline corner relative p-8">
              <span className="mb-5 block h-px w-10 bg-gold" aria-hidden />
              <h3 className="font-display text-lg font-medium text-porcelain">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-porcelain-soft">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
