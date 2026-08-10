"use server";

import {
  AuctionError,
  createAuction,
  createAuctionSchema,
  logger,
  placeBid
} from "@estatex/core";
import { requireUser } from "@/src/guards";
import { publishAuctionEvent } from "@/src/realtime";

export type CreateAuctionActionResult = { ok: true; auctionId: string } | { ok: false; error: string };

export async function createAuctionAction(input: unknown): Promise<CreateAuctionActionResult> {
  const user = await requireUser();
  const parsed = createAuctionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid auction data" };
  }
  try {
    const auction = await createAuction(user.id, parsed.data);
    await publishAuctionEvent({
      auctionId: auction.id,
      type: "AUCTION_STARTED",
      startPriceCents: Number(auction.startPriceCents),
      endAt: auction.endAt.toISOString()
    });
    logger.info({ auctionId: auction.id, sellerId: user.id }, "auction created");
    return { ok: true, auctionId: auction.id };
  } catch (err) {
    if (err instanceof AuctionError) {
      return { ok: false, error: err.message };
    }
    logger.error({ err, sellerId: user.id }, "create auction failed");
    return { ok: false, error: "Failed to create auction. Please try again." };
  }
}

export type PlaceBidActionResult =
  | { ok: true; currentPriceCents: number; newEndAt: string; extended: boolean }
  | { ok: false; error: string };

export async function placeBidAction(auctionId: string, amountCents: number): Promise<PlaceBidActionResult> {
  const user = await requireUser();
  try {
    const result = await placeBid(auctionId, user.id, amountCents);
    await publishAuctionEvent({
      auctionId,
      type: "BID",
      bidId: result.bid.id,
      bidderId: user.id,
      amountCents: result.currentPriceCents,
      currentPriceCents: result.currentPriceCents,
      extended: result.extended,
      newEndAt: result.newEndAtIso
    });
    return {
      ok: true,
      currentPriceCents: result.currentPriceCents,
      newEndAt: result.newEndAtIso,
      extended: result.extended
    };
  } catch (err) {
    if (err instanceof AuctionError) {
      return { ok: false, error: err.message };
    }
    logger.error({ err, auctionId }, "place bid failed");
    return { ok: false, error: "Bid failed. Please try again." };
  }
}
