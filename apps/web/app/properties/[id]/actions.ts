"use server";

import { generateListingDraft, approveListingDraft } from "@/src/ai/listing";
import { estimateValue, type ValuationEstimate } from "@/src/ai/valuation";
import { requireUser } from "@/src/guards";

export type AiActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function generateListingAction(propertyId: string): Promise<AiActionResult<{ status: string }>> {
  const user = await requireUser();
  try {
    const draft = await generateListingDraft(user.id, propertyId);
    return { ok: true, data: { status: draft.status } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Generation failed" };
  }
}

export async function approveListingAction(propertyId: string): Promise<AiActionResult<{ ok: true }>> {
  const user = await requireUser();
  try {
    await approveListingDraft(user.id, propertyId);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Approval failed" };
  }
}

export async function estimateValueAction(propertyId: string): Promise<AiActionResult<ValuationEstimate>> {
  await requireUser();
  try {
    const estimate = await estimateValue(propertyId);
    return { ok: true, data: estimate };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Valuation failed" };
  }
}
