import { requireUser } from "@/src/guards";
import PropertyForm from "./PropertyForm";

export default async function NewPropertyPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl text-ink">List a property</h1>
      <p className="mt-1 text-sm text-ink-soft">Publish a listing for sale on the global marketplace.</p>
      <PropertyForm />
    </main>
  );
}
