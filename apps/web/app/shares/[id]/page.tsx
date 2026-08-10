import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getShareProgram } from "@estatex/core";
import { getCurrentUser } from "@/src/guards";
import { formatMoney } from "@/src/format";
import BuyForm from "./BuyForm";
import PostAskForm from "./PostAskForm";
import DeclareDividendForm from "./DeclareDividendForm";

export const dynamic = "force-dynamic";

export default async function ShareProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getShareProgram(id);
  if (!program) {
    notFound();
  }
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const property = program.property;
  const cover = property.images[0];
  const isOwner = userId === property.ownerId;

  const myHolding = program.holdings.find((h) => h.ownerId === userId);
  const myUnits = myHolding?.units ?? 0;
  const openAsksByMe = program.asks.filter((a) => a.sellerId === userId);
  const committedByMe = openAsksByMe.reduce((sum, a) => sum + a.unitsLeft, 0);
  const sellableUnits = Math.max(0, myUnits - committedByMe);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/properties/${property.id}`} className="text-sm text-cadastral hover:underline">
        ← {property.title}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          {cover ? (
            <Image src={cover.url} alt={cover.alt ?? property.title} width={800} height={520} className="aspect-[4/3] w-full  object-cover" />
          ) : (
            <div className="aspect-[4/3] w-full  bg-paper-deep" />
          )}
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="border border-hairline p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Price per share</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{formatMoney(program.pricePerShareCents, property.currency)}</dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Shares</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{program.issuedShares.toLocaleString()} / {program.totalShares.toLocaleString()} issued</dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Shareholders</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{program.holdings.length}</dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Location</dt>
              <dd className="mt-0.5 font-medium text-ink">{property.city}, {property.country}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div>
            <p className="figure text-[0.62rem] uppercase tracking-[0.28em] text-cadastral">Share lot</p>
            <h1 className="mt-1 font-display text-3xl text-ink">{property.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">Own a fraction of this property and earn dividends.</p>
          </div>

          {userId && (
            <div className=" border border-hairline p-4 text-sm">
              <p>
                <span className="text-ink-soft">Your holding:</span>{" "}
                <span className="font-medium">{myUnits.toLocaleString()} units</span>
              </p>
              {sellableUnits > 0 && !isOwner && (
                <div className="mt-3">
                  <PostAskForm programId={program.id} maxUnits={sellableUnits} />
                </div>
              )}
              {isOwner && sellableUnits > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-ink-soft">You hold {sellableUnits.toLocaleString()} sellable units.</p>
                  <div className="mt-2">
                    <PostAskForm programId={program.id} maxUnits={sellableUnits} />
                  </div>
                </div>
              )}
            </div>
          )}

          {program.asks.length > 0 ? (
            <div className=" border border-hairline p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Open asks</h2>
              <ul className="mt-3 space-y-3">
                {program.asks.map((ask) => (
                  <li key={ask.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="figure font-medium text-ink">
                        {ask.unitsLeft.toLocaleString()} units @ {formatMoney(ask.pricePerUnitCents, property.currency)}
                      </p>
                      <p className="text-xs text-ink-soft">by {ask.seller.name}</p>
                    </div>
                    {userId && ask.sellerId !== userId ? (
                      <BuyForm askId={ask.id} pricePerUnitCents={Number(ask.pricePerUnitCents)} unitsLeft={ask.unitsLeft} />
                    ) : (
                      <span className="text-xs text-ink-soft">{ask.sellerId === userId ? "Your ask" : "Sign in to buy"}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className=" border border-hairline p-4 text-sm text-ink-soft">
              No open asks right now.
            </div>
          )}

          {isOwner && (
            <div className=" border border-hairline p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Dividends</h2>
              <p className="mt-1 text-sm text-ink-soft">Payout to every shareholder per unit held.</p>
              <div className="mt-3">
                <DeclareDividendForm programId={program.id} />
              </div>
            </div>
          )}

          {program.dividends.length > 0 && (
            <div className=" border border-hairline p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Dividend history</h2>
              <ul className="mt-2 divide-y divide-hairline text-sm">
                {program.dividends.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2">
                    <span className="figure text-ink">{formatMoney(d.perShareCents, property.currency)} / share</span>
                    <span className={`figure text-[0.62rem] tracking-[0.16em] ${d.status === "PAID" ? "text-cadastral" : "text-stamp"}`}>{d.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
