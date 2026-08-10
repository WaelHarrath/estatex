import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/src/guards";
import { recommendForUser } from "@/src/ai/matching";
import { getProperty } from "@estatex/core";
import { formatMoney } from "@/src/format";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
  searchParams
}: {
  searchParams: Promise<{ budget?: string; city?: string; country?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const budgetCents = params.budget ? Math.round(Number(params.budget) * 100) : undefined;
  const city = params.city || undefined;
  const country = params.country || undefined;

  const matches = budgetCents || city || country ? await recommendForUser(budgetCents, city, country) : [];

  const inputClass = "mt-1 w-full  border border-hairline px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl text-ink">AI property matches</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Tell us your budget and preferred area; we rank active listings for you.
      </p>

      <form method="GET" className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="budget" className="block text-sm font-medium">Max budget (USD)</label>
          <input id="budget" name="budget" type="number" step="0.01" min="0.01" defaultValue={params.budget ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium">City</label>
          <input id="city" name="city" type="text" defaultValue={params.city ?? ""} className={inputClass} />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary">
            Find matches
          </button>
        </div>
      </form>

      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-soft">
          {budgetCents || city || country
            ? "No matching properties found. Try widening your budget or area."
            : "Set a budget and area above to get matches."}
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {await Promise.all(
            matches.map(async (match) => {
              const property = await getProperty(match.propertyId);
              if (!property) return null;
              const cover = property.images[0];
              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="flex gap-4  border border-hairline p-4 transition hover:border-hairline"
                >
                  {cover ? (
                    <Image src={cover.url} alt={cover.alt ?? property.title} width={160} height={120} className="h-24 w-40  object-cover" />
                  ) : (
                    <div className="h-24 w-40  bg-paper-deep" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{property.title}</p>
                      <span className=" bg-cadastral/10 px-2 py-0.5 text-xs font-medium text-cadastral">
                        {match.score}/10
                      </span>
                    </div>
                    <p className="text-sm text-ink-soft">
                      {property.city}, {property.country} · {formatMoney(property.priceCents, property.currency)}
                    </p>
                    <p className="mt-1 text-sm text-ink">{match.reason}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}
