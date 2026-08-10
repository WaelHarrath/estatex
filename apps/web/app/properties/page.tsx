import Link from "next/link";
import { listProperties } from "@estatex/core";
import LotCard from "../components/LotCard";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await listProperties();
  const lotNo = new Map(properties.map((p, i) => [p.id, i + 1]));

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <p className="eyebrow">The board</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-porcelain">
            Properties for sale
          </h1>
          <p className="mt-2 text-sm text-porcelain-soft">
            Live auctions, fractional shares, and direct sales worldwide.
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary !px-5 !py-2.5 !text-sm">
          List a property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="glass keyline mt-12 rounded-xl p-16 text-center">
          <p className="font-display text-2xl font-semibold text-porcelain">No lots on the board.</p>
          <p className="mt-2 text-sm text-porcelain-soft">List the first property and open the market.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
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
      )}
    </main>
  );
}
