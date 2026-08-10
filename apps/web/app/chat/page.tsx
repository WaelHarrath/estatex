import { requireUser } from "@/src/guards";
import ChatPanel from "./ChatPanel";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  await requireUser();
  const { property } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl text-ink">AI concierge</h1>
      <p className="mt-1 text-sm text-ink-soft">Ask anything about listings, auctions, and house shares.</p>
      <div className="mt-6">
        <ChatPanel propertyId={property} />
      </div>
    </main>
  );
}
