"use server";

import {
  buyShares,
  buySharesSchema,
  createShareProgram,
  createShareProgramSchema,
  declareDividend,
  declareDividendSchema,
  logger,
  postShareAsk,
  postShareAskSchema,
  SharesError
} from "@estatex/core";
import { requireUser } from "@/src/guards";
import { publishDividendEvent } from "@/src/realtime";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function unwrap<T>(err: unknown, fallback: string): string {
  if (err instanceof SharesError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function createShareProgramAction(input: unknown): Promise<ActionResult<{ programId: string }>> {
  const user = await requireUser();
  const parsed = createShareProgramSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid share program data" };
  try {
    const program = await createShareProgram(user.id, parsed.data);
    logger.info({ programId: program.id, ownerId: user.id }, "share program created");
    return { ok: true, data: { programId: program.id } };
  } catch (err) {
    logger.error({ err, ownerId: user.id }, "create share program failed");
    return { ok: false, error: unwrap(err, "Failed to create share program.") };
  }
}

export async function postShareAskAction(input: unknown): Promise<ActionResult<{ askId: string }>> {
  const user = await requireUser();
  const parsed = postShareAskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ask data" };
  try {
    const ask = await postShareAsk(user.id, parsed.data);
    return { ok: true, data: { askId: ask.id } };
  } catch (err) {
    logger.error({ err, sellerId: user.id }, "post share ask failed");
    return { ok: false, error: unwrap(err, "Failed to post ask.") };
  }
}

export async function buySharesAction(input: unknown): Promise<ActionResult<{ units: number; priceCents: number }>> {
  const user = await requireUser();
  const parsed = buySharesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid purchase data" };
  try {
    const result = await buyShares(user.id, parsed.data);
    return { ok: true, data: result };
  } catch (err) {
    logger.error({ err, buyerId: user.id }, "buy shares failed");
    return { ok: false, error: unwrap(err, "Purchase failed.") };
  }
}

export async function declareDividendAction(input: unknown): Promise<ActionResult<{ dividendId: string }>> {
  const user = await requireUser();
  const parsed = declareDividendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid dividend data" };
  try {
    const dividend = await declareDividend(user.id, parsed.data);
    await publishDividendEvent({ dividendId: dividend.id, type: "DIVIDEND_DECLARED" });
    return { ok: true, data: { dividendId: dividend.id } };
  } catch (err) {
    logger.error({ err, actorId: user.id }, "declare dividend failed");
    return { ok: false, error: unwrap(err, "Failed to declare dividend.") };
  }
}
