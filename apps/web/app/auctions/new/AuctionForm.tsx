"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuctionAction } from "../actions";

function toCents(dollars: string): number | null {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function AuctionForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const startPriceCents = toCents(String(form.get("startPrice") ?? ""));
    const minIncrementCents = toCents(String(form.get("minIncrement") ?? ""));
    const minutes = Number(form.get("duration"));

    if (startPriceCents === null || minIncrementCents === null || !Number.isFinite(minutes) || minutes <= 0) {
      setError("Enter valid prices and a positive duration");
      setPending(false);
      return;
    }

    const endAt = new Date(Date.now() + minutes * 60 * 1000);
    const result = await createAuctionAction({
      propertyId,
      startPriceCents,
      minIncrementCents,
      endAt
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/auctions/${result.auctionId}`);
    router.refresh();
  }

  const inputClass = "mt-1 w-full  border border-hairline px-3 py-2";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="startPrice" className="block text-sm font-medium">Starting price (USD)</label>
          <input id="startPrice" name="startPrice" type="number" step="0.01" min="0.01" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="minIncrement" className="block text-sm font-medium">Minimum increment (USD)</label>
          <input id="minIncrement" name="minIncrement" type="number" step="0.01" min="0.01" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium">Duration (minutes)</label>
          <input id="duration" name="duration" type="number" min="1" defaultValue={30} required className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        Bids placed in the final 30 seconds extend the auction automatically (anti-sniping).
      </p>
      {error && <p className="text-sm text-stamp">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary disabled:opacity-50"
      >
        {pending ? "Creating auction…" : "Start auction"}
      </button>
    </form>
  );
}
