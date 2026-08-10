import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProperty } from "@estatex/core";
import { getCurrentUser } from "@/src/guards";
import { formatMoney } from "@/src/format";
import AiListingCard, { type DraftPreview } from "./AiListingCard";
import ValuationCard from "./ValuationCard";
import Stamp from "@/app/components/Stamp";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  const user = await getCurrentUser();
  const isOwner = user?.id === property.ownerId;

  const cover = property.images[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/properties" className="figure text-sm text-cadastral transition hover:text-gold-bright">
        ← All properties
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* ── The lot plate ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="glass keyline corner relative overflow-hidden rounded-lg p-1">
            <div className="relative overflow-hidden rounded-md">
              {property.images.length > 0 ? (
                <Image
                  src={cover!.url}
                  alt={cover!.alt ?? property.title}
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
          {property.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {property.images.map((img) => (
                <Image
                  key={img.id}
                  src={img.url}
                  alt={img.alt ?? property.title}
                  width={200}
                  height={150}
                  className="aspect-[4/3] w-full border border-hairline object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* ── The dossier ───────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="figure text-[0.62rem] uppercase tracking-[0.28em] text-cadastral">
                Registered lot · EstateX ledger
              </p>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">{property.title}</h1>
            </div>
            {property.auction?.status === "LIVE" ? (
              <Stamp>Live</Stamp>
            ) : property.shareProgram ? (
              <Stamp tone="cadastral">Shares</Stamp>
            ) : (
              <Stamp tone="ink">{property.status}</Stamp>
            )}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {property.address}, {property.city}, {property.country}
          </p>
          <p className="figure mt-4 text-3xl font-medium tracking-tight text-gold-bright">
            {formatMoney(property.priceCents, property.currency)}
          </p>

          {/* The survey — spec grid */}
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Area</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{property.sqft.toLocaleString()} SQFT</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Bedrooms</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{property.bedrooms}</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Bathrooms</dt>
              <dd className="figure mt-0.5 font-medium text-ink">{property.bathrooms}</dd>
            </div>
            <div className="border border-hairline bg-panel p-3">
              <dt className="figure text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">Listed by</dt>
              <dd className="mt-0.5 font-medium text-ink">{property.owner.name}</dd>
            </div>
          </dl>

          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-ink">{property.description}</p>

          {user && <div className="mt-6"><ValuationCard propertyId={property.id} /></div>}
          {isOwner && (
            <div className="mt-6">
              <AiListingCard
                propertyId={property.id}
                draft={
                  property.aiDraft
                    ? {
                        title: property.aiDraft.title,
                        description: property.aiDraft.description,
                        bullets: Array.isArray(property.aiDraft.bullets) ? (property.aiDraft.bullets as string[]) : [],
                        status: property.aiDraft.status
                      }
                    : null
                }
              />
            </div>
          )}

          {/* The bid desk */}
          <div className="mt-8 space-y-3">
            {isOwner && !property.auction && property.status !== "SOLD" && (
              <Link
                href={`/auctions/new?propertyId=${property.id}`}
                className="btn-primary block w-full"
              >
                Start a live auction
              </Link>
            )}
            {isOwner && !property.shareProgram && property.status !== "SOLD" && (
              <Link
                href={`/shares/new?propertyId=${property.id}`}
                className="btn-primary block w-full"
              >
                Create a share program
              </Link>
            )}
            {property.auction && (
              <Link
                href={`/auctions/${property.auction.id}`}
                className="btn-primary block w-full"
              >
                View live auction
              </Link>
            )}
            {property.shareProgram && (
              <Link
                href={`/shares/${property.shareProgram.id}`}
                className="btn-primary block w-full"
              >
                Buy house shares
              </Link>
            )}
            <Link
              href={`/chat?property=${property.id}`}
              className="btn-ghost block w-full"
            >
              Ask the AI concierge about this property
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
