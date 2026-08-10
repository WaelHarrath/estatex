import { requireUser } from "@/src/guards";
import AuctionForm from "./AuctionForm";

export const dynamic = "force-dynamic";

export default async function NewAuctionPage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  await requireUser();
  const { propertyId } = await searchParams;

  if (!propertyId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">Start a live auction</h1>
        <p className="mt-2 text-sm text-stamp">Missing property reference. Open a property to start its auction.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl text-ink">Start a live auction</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Set the opening price and duration. Bids inside the final 30 seconds extend the clock.
      </p>
      <AuctionForm propertyId={propertyId} />
    </main>
  );
}
