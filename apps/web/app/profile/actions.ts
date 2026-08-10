"use server";

import { getProperty, setPropertyStatus } from "@estatex/core";
import { requireUser } from "@/src/guards";

export type StatusActionResult = { ok: true } | { ok: false; error: string };

/** Toggles a property between ACTIVE and OFF_MARKET. Owner-only. */
export async function setPropertyStatusAction(
  propertyId: string,
  status: "ACTIVE" | "OFF_MARKET"
): Promise<StatusActionResult> {
  const user = await requireUser();
  try {
    const property = await getProperty(propertyId);
    if (!property) {
      return { ok: false, error: "Property not found" };
    }
    if (property.ownerId !== user.id) {
      return { ok: false, error: "You do not own this property" };
    }
    await setPropertyStatus(propertyId, status);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update property" };
  }
}
