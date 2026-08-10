"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShareProgramAction } from "../actions";

function toCents(dollars: string): number | null {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function ShareProgramForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const totalShares = Number(form.get("totalShares"));
    const pricePerShareCents = toCents(String(form.get("pricePerShare") ?? ""));

    if (!Number.isInteger(totalShares) || totalShares <= 0 || pricePerShareCents === null) {
      setError("Enter a positive number of shares and a valid per-share price");
      setPending(false);
      return;
    }

    const result = await createShareProgramAction({ propertyId, totalShares, pricePerShareCents });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/shares/${result.data.programId}`);
    router.refresh();
  }

  const inputClass = "mt-1 w-full  border border-hairline px-3 py-2";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="totalShares" className="block text-sm font-medium">Total shares</label>
          <input id="totalShares" name="totalShares" type="number" min="1" max="1000000" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="pricePerShare" className="block text-sm font-medium">Price per share (USD)</label>
          <input id="pricePerShare" name="pricePerShare" type="number" step="0.01" min="0.01" required className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        You will hold 100% of the shares initially and can sell units by posting asks.
      </p>
      {error && <p className="text-sm text-stamp">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary disabled:opacity-50"
      >
        {pending ? "Creating program…" : "Create share program"}
      </button>
    </form>
  );
}
