"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { declareDividendAction } from "../actions";

function toCents(dollars: string): number | null {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function DeclareDividendForm({ programId }: { programId: string }) {
  const router = useRouter();
  const [perShare, setPerShare] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const perShareCents = toCents(perShare);
    if (perShareCents === null) {
      setError("Enter a valid per-share amount");
      return;
    }
    setPending(true);
    setError(null);
    const result = await declareDividendAction({ programId, perShareCents });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPerShare("");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-ink-soft">Payout per share (USD)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={perShare}
          onChange={(e) => setPerShare(e.target.value)}
          placeholder="0.50"
          className="mt-1 w-28  border border-hairline px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary disabled:opacity-50"
      >
        {pending ? "Declaring…" : "Declare dividend"}
      </button>
      {error && <p className="w-full text-sm text-stamp">{error}</p>}
    </form>
  );
}
