"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postShareAskAction } from "../actions";

export default function PostAskForm({ programId, maxUnits }: { programId: string; maxUnits: number }) {
  const router = useRouter();
  const [units, setUnits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const n = Number(units);
    if (!Number.isInteger(n) || n <= 0 || n > maxUnits) {
      setError(`Enter between 1 and ${maxUnits} units`);
      return;
    }
    setPending(true);
    setError(null);
    const result = await postShareAskAction({ programId, units: n });
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
        <label className="block text-xs font-medium text-ink-soft">Units to sell</label>
        <input
          type="number"
          min={1}
          max={maxUnits}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          placeholder={`1–${maxUnits}`}
          className="mt-1 w-24  border border-hairline px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className=" border border-hairline px-4 py-1.5 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post ask"}
      </button>
      {error && <p className="w-full text-sm text-stamp">{error}</p>}
    </form>
  );
}
