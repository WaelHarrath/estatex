"use client";

import { useState } from "react";

const MIN_DOLLARS = 1;
const MAX_DOLLARS = 100_000;
const PRESETS = [250, 500, 1000, 5000];

export default function FundButton() {
  const [dollars, setDollars] = useState(1000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fund(amountCents: number) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Funding unavailable");
        setPending(false);
        return;
      }
      const body = (await res.json()) as { url: string };
      window.location.href = body.url;
    } catch {
      setError("Funding unavailable");
      setPending(false);
    }
  }

  function submit() {
    const amount = Math.round(Number(dollars));
    if (!Number.isFinite(amount) || amount < MIN_DOLLARS || amount > MAX_DOLLARS) {
      setError(`Enter an amount between $${MIN_DOLLARS.toLocaleString()} and $${MAX_DOLLARS.toLocaleString()}.`);
      return;
    }
    setError(null);
    fund(amount * 100);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setDollars(p);
              setError(null);
            }}
            className="btn-ghost figure text-sm"
          >
            ${p.toLocaleString()}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="fund-amount">Top-up amount in USD</label>
        <input
          id="fund-amount"
          type="number"
          min={MIN_DOLLARS}
          max={MAX_DOLLARS}
          step={50}
          value={dollars}
          onChange={(e) => setDollars(e.target.value === "" ? 0 : Number(e.target.value))}
          className="figure w-40 rounded border border-hairline bg-abyss-deep px-3 py-2 text-ink outline-none focus:border-gold"
        />
        <button type="button" onClick={submit} disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Redirecting…" : `Add $${Number(dollars || 0).toLocaleString()} (test mode)`}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
    </div>
  );
}
