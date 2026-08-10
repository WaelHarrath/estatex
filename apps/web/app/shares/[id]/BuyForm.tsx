"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buySharesAction } from "../actions";
import { formatMoney } from "@/src/format";

export default function BuyForm({ askId, pricePerUnitCents, unitsLeft }: { askId: string; pricePerUnitCents: number; unitsLeft: number }) {
  const router = useRouter();
  const [units, setUnits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const n = Number(units);
    if (!Number.isInteger(n) || n <= 0 || n > unitsLeft) {
      setError(`Enter between 1 and ${unitsLeft} units`);
      return;
    }
    setPending(true);
    setError(null);
    const result = await buySharesAction({ askId, units: n });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setUnits("");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-ink-soft">Units</label>
        <input
          type="number"
          min={1}
          max={unitsLeft}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          placeholder={`1–${unitsLeft}`}
          className="mt-1 w-24  border border-hairline px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary disabled:opacity-50"
      >
        {pending ? "Buying…" : `Buy at ${formatMoney(BigInt(pricePerUnitCents))}/share`}
      </button>
      {error && <p className="w-full text-sm text-stamp">{error}</p>}
    </form>
  );
}
