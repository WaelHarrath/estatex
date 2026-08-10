"use server";

import { createProperty, createPropertySchema, logger } from "@estatex/core";
import { requireUser } from "@/src/guards";

export type CreatePropertyResult = { ok: true; propertyId: string } | { ok: false; error: string };

export async function createPropertyAction(input: unknown): Promise<CreatePropertyResult> {
  const user = await requireUser();

  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid property data" };
  }

  try {
    const property = await createProperty(user.id, parsed.data);
    logger.info({ propertyId: property.id, ownerId: user.id }, "property created");
    return { ok: true, propertyId: property.id };
  } catch (err) {
    logger.error({ err, ownerId: user.id }, "create property failed");
    return { ok: false, error: "Failed to create property. Please try again." };
  }
}
