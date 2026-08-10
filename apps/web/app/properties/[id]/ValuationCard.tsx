"use client";

import { useState } from "react";
import { estimateValueAction } from "./actions";
import { formatMoney } from "@/src/format";

interface Estimate {
  estimateMinCents: number;
  estimateMaxCents: number;
  rationale: string;
}

export default function ValuationCard({ propertyId }: { propertyId: string }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const result = await estimateValueAction(propertyId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setEstimate(result.data);
    setBusy(false);
  }

  return (
    <div className=" border border-hairline p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">AI valuation</h2>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn-ghost disabled:opacity-50"
        >
          {busy ? "Analyzing comparables…" : estimate ? "Re-estimate" : "Estimate value"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
      {estimate && (
        <div className="mt-3 text-sm">
          <p className="text-lg font-semibold">
            {formatMoney(BigInt(estimate.estimateMinCents))} – {formatMoney(BigInt(estimate.estimateMaxCents))}
          </p>
          <p className="mt-1 text-ink-soft">{estimate.rationale}</p>
        </div>
      )}
    </div>
  );
}
