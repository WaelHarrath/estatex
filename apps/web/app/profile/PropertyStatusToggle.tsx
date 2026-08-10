"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPropertyStatusAction } from "./actions";

export default function PropertyStatusToggle({
  propertyId,
  status
}: {
  propertyId: string;
  status: "ACTIVE" | "OFF_MARKET";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = status === "ACTIVE" ? "OFF_MARKET" : "ACTIVE";

  function toggle() {
    startTransition(async () => {
      await setPropertyStatusAction(propertyId, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-50"
    >
      {pending ? "Updating…" : status === "ACTIVE" ? "Take off market" : "Re-list"}
    </button>
  );
}
