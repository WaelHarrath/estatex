import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/src/format";
import Stamp from "./Stamp";

export interface LotCardData {
  id: string;
  lotNumber: number;
  title: string;
  city: string;
  country: string;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  priceCents: bigint;
  currency: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  state?: "LIVE" | "SHARES" | "SOLD" | "SALE";
}

const STATE_TONE: Record<NonNullable<LotCardData["state"]>, string> = {
  LIVE: "border-gold/50 text-gold-bright bg-gold/10 shadow-[0_0_18px_rgba(201,169,106,0.25)]",
  SHARES: "border-azure/50 text-azure bg-azure/10",
  SALE: "border-hairline-bright text-porcelain-soft bg-panel-2",
  SOLD: "border-hairline-bright text-porcelain-faint bg-panel"
};

/** A property as a numbered dossier: glass surface, gold keyline,
 *  mono spec strip, exact price, and a live state chip. */
export default function LotCard({ lot }: { lot: LotCardData }) {
  const spec = [
    lot.sqft ? `${lot.sqft.toLocaleString()} SQFT` : null,
    lot.bedrooms ? `${lot.bedrooms} BEDS` : null,
    lot.bathrooms ? `${lot.bathrooms} BATHS` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/properties/${lot.id}`}
      className="group relative block overflow-hidden rounded-lg border border-hairline bg-panel transition duration-200 hover:border-gold/60 hover:shadow-[0_0_0_1px_rgba(201,169,106,0.25),0_16px_48px_-16px_rgba(0,0,0,0.85)]"
    >
      {/* Luminous gold keyline across the top edge. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
        aria-hidden
      />

      <div className="relative">
        {lot.imageUrl ? (
          <Image
            src={lot.imageUrl}
            alt={lot.imageAlt ?? lot.title}
            width={600}
            height={400}
            className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="survey-grid h-44 w-full bg-panel-2" />
        )}
        {/* Scrim so the chip row reads on any image. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-abyss/70 via-transparent to-abyss/20"
          aria-hidden
        />
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between">
          <span className="figure rounded-md border border-hairline-bright bg-abyss/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold backdrop-blur-sm">
            Lot {String(lot.lotNumber).padStart(2, "0")}
          </span>
          {lot.state && (
            <span
              className={`figure rounded-md border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm ${STATE_TONE[lot.state]}`}
            >
              {lot.state}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-5">
        <div>
          <h2 className="font-display text-base font-medium leading-snug text-porcelain">
            {lot.title}
          </h2>
          <p className="mt-0.5 text-xs text-porcelain-soft">
            {lot.city}, {lot.country}
          </p>
        </div>
        {spec && (
          <p className="figure text-[0.6rem] uppercase tracking-[0.16em] text-porcelain-faint">
            {spec}
          </p>
        )}
        <p className="figure pt-1 text-lg font-medium tracking-tight text-gold-bright">
          {formatMoney(lot.priceCents, lot.currency)}
        </p>
      </div>
    </Link>
  );
}
