import { requireUser } from "@/src/guards";
import ShareProgramForm from "./ShareProgramForm";

export const dynamic = "force-dynamic";

export default async function NewShareProgramPage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  await requireUser();
  const { propertyId } = await searchParams;

  if (!propertyId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">Create a share program</h1>
        <p className="mt-2 text-sm text-stamp">Missing property reference. Open a property to create its share program.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl text-ink">Fractionalize this property</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Issue shares that buyers can purchase and earn dividends on.
      </p>
      <ShareProgramForm propertyId={propertyId} />
    </main>
  );
}
