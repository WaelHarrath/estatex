import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAuction } from "@estatex/core";
import { getCurrentUser } from "@/src/guards";
import { formatMoney } from "@/src/format";
import AuctionRoom, { type LiveBid } from "./AuctionRoom";

export const dynamic = "force-dynamic";

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auction = await getAuction(id);
  if (!auction) {
    notFound();
  }
  const user = await getCurrentUser();

  const property = auction.property;
  const cover = property.images[0];

  const initialBids: LiveBid[] = auction.bids.map((bid) => ({
    id: bid.id,
    bidderId: bid.bidderId,
    bidderName: bid.bidder.name,
    amountCents: Number(bid.amountCents),
    createdAt: bid.createdAt.toISOString()
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href={`/properties/${property.id}`}
        className="figure text-sm text-cadastral transition hover:text-gold-bright"
      >
        ← {property.title}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* ── The lot plate ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="glass keyline corner relative overflow-hidden rounded-lg p-1">
            <div className="relative overflow-hidden rounded-md">
              {cover ? (
                <Image
                  src={cover.url}
                  alt={cover.alt ?? property.title}
                  width={800}
                  height={520}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-abyss-deep" />
              )}
              <span className="survey-grid absolute inset-0 opacity-40" aria-hidden />
              <div
                className="absolute inset-0 bg-gradient-to-t from-abyss/70 via-transparent to-transparent"
                aria-hidden
              />
              <span className="crosshair left-4 top-4" aria-hidden />
              <span className="crosshair right-4 bottom-4" aria-hidden />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="figure text-[0.62rem] uppercase tracking-[0.24em] text-gold-bright">
                  Lot {property.id.slice(-4).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* The survey — auction terms */}
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Starting price</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{formatMoney(auction.startPriceCents, property.currency)}</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Minimum increment</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{formatMoney(auction.minIncrementCents, property.currency)}</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Location</dt>
              <dd className="font-medium text-ink">{property.city}, {property.country}</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Seller</dt>
              <dd className="font-medium text-ink">{property.owner.name}</dd>
            </div>
          </dl>
        </div>

        {/* ── The room ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="figure text-[0.62rem] uppercase tracking-[0.28em] text-cadastral">
                The live room
              </p>
              <h1 className="mt-1 font-display text-2xl leading-tight text-ink">{property.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="live-dot" aria-hidden />
              <span className="figure text-[0.6rem] uppercase tracking-[0.24em] text-ink-soft">
                {auction.status === "LIVE" ? "Live" : auction.status}
              </span>
            </div>
          </div>
          <AuctionRoom
            auctionId={auction.id}
            sellerId={auction.sellerId}
            currentUserId={user?.id ?? null}
            currentPriceCents={Number(auction.currentPriceCents)}
            minIncrementCents={Number(auction.minIncrementCents)}
            endAtIso={auction.endAt.toISOString()}
            status={auction.status}
            initialBids={initialBids}
          />
        </div>
      </div>
    </main>
  );
}
