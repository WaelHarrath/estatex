"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveListingAction, generateListingAction } from "./actions";

export interface DraftPreview {
  title: string;
  description: string;
  bullets: string[];
  status: string;
}

export default function AiListingCard({ propertyId, draft }: { propertyId: string; draft: DraftPreview | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftPreview | null>(draft);

  async function generate() {
    setBusy(true);
    setError(null);
    const result = await generateListingAction(propertyId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  async function approve() {
    setBusy(true);
    setError(null);
    const result = await approveListingAction(propertyId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <div className=" border border-hairline p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">AI listing generator</h2>
        {!preview && (
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Writing…" : "Generate draft"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
      {preview && (
        <div className="mt-3 space-y-3">
          <div className=" border border-hairline bg-panel p-3 text-sm">
            <p className="font-semibold">{preview.title}</p>
            <p className="mt-1 text-ink">{preview.description}</p>
            {preview.bullets.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
                {preview.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className=" bg-paper-deep px-2 py-0.5 text-stamp">{preview.status}</span>
            {preview.status !== "APPROVED" && (
              <button
                type="button"
                onClick={approve}
                disabled={busy}
                className="btn-primary disabled:opacity-50"
              >
                Approve & publish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
