"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPropertyAction } from "./actions";

function toCents(dollars: string): number | null {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function PropertyForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      return;
    }
    const body = (await res.json()) as { url: string };
    setImageUrls((prev) => [...prev, body.url]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const priceCents = toCents(String(form.get("price") ?? ""));
    if (priceCents === null) {
      setError("Enter a valid price in USD");
      setPending(false);
      return;
    }

    const result = await createPropertyAction({
      title: form.get("title"),
      description: form.get("description"),
      priceCents,
      currency: "USD",
      country: form.get("country"),
      city: form.get("city"),
      address: form.get("address"),
      sqft: Number(form.get("sqft")),
      bedrooms: Number(form.get("bedrooms")),
      bathrooms: Number(form.get("bathrooms")),
      images: imageUrls.map((url) => ({ url, alt: null, sortOrder: 0 }))
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/properties/${result.propertyId}`);
    router.refresh();
  }

  const inputClass = "mt-1 w-full  border border-hairline px-3 py-2";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input id="title" name="title" required maxLength={160} className={inputClass} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="block text-sm font-medium">Price (USD)</label>
          <input id="price" name="price" type="number" step="0.01" min="0.01" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sqft" className="block text-sm font-medium">Area (sqft)</label>
          <input id="sqft" name="sqft" type="number" min="1" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="bedrooms" className="block text-sm font-medium">Bedrooms</label>
          <input id="bedrooms" name="bedrooms" type="number" min="0" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="bathrooms" className="block text-sm font-medium">Bathrooms</label>
          <input id="bathrooms" name="bathrooms" type="number" min="0" required className={inputClass} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="country" className="block text-sm font-medium">Country</label>
          <input id="country" name="country" required maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium">City</label>
          <input id="city" name="city" required maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium">Address</label>
          <input id="address" name="address" required maxLength={200} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">Description</label>
        <textarea id="description" name="description" required maxLength={5000} rows={5} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium">Photos</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadImage}
          className="mt-1 block text-sm"
        />
        {imageUrls.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {imageUrls.map((url) => (
              <li key={url} className="flex items-center justify-between rounded border border-hairline px-3 py-1">
                <span className="truncate">{url}</span>
                <button type="button" onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))} className="ml-3 text-stamp">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-stamp">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}
