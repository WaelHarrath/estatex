import type { Auction, Bid } from "../../generated/prisma/client.js";
import { createAuctionSchema, placeBidSchema, type CreateAuctionInput } from "../contracts.js";
import { prisma } from "../db.js";
import { fromCents, toCents } from "../money.js";
import { logger } from "../logger.js";
import { extendedEnd, isEnded, minimumNextBid } from "./auction-rules.js";
import { releaseReserve, reserveFunds, settleReserve } from "./wallet.js";

export class AuctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuctionError";
  }
}

export interface PlaceBidResult {
  bid: Bid;
  currentPriceCents: number;
  extended: boolean;
  newEndAt: Date;
  newEndAtIso: string;
}

export interface SettleResult {
  settled: boolean;
  winnerBidId: string | null;
  winnerBidderId: string | null;
  winnerAmountCents: number | null;
}

export async function createAuction(sellerId: string, input: CreateAuctionInput) {
  const data = createAuctionSchema.parse(input);

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw new AuctionError("Property not found");
  }
  if (property.ownerId !== sellerId) {
    throw new AuctionError("Only the property owner can create an auction");
  }
  const existing = await prisma.auction.findUnique({ where: { propertyId: property.id } });
  if (existing) {
    throw new AuctionError("This property already has an auction");
  }

  const startAt = data.startAt ?? new Date();
  const status = startAt.getTime() <= Date.now() ? "LIVE" : "SCHEDULED";

  return prisma.auction.create({
    data: {
      propertyId: property.id,
      sellerId,
      startPriceCents: toCents(data.startPriceCents),
      currentPriceCents: toCents(data.startPriceCents),
      minIncrementCents: toCents(data.minIncrementCents),
      startAt,
      endAt: data.endAt,
      autoExtendSeconds: data.autoExtendSeconds,
      status
    }
  });
}

/**
 * Places a bid. The auction row is locked (SELECT ... FOR UPDATE) for the
 * duration of the transaction so concurrent bids are processed serially.
 * Funds are moved to a reserved hold atomically; the previous leading bidder
 * is outbid and their hold released in the same transaction.
 */
export async function placeBid(auctionId: string, bidderId: string, amountCents: number): Promise<PlaceBidResult> {
  placeBidSchema.parse({ auctionId, amountCents });

  return prisma.$transaction(async (tx) => {
    // Serialize bids on this auction via a row lock.
    await tx.$queryRaw`SELECT id FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`;

    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new AuctionError("Auction not found");
    }
    if (auction.status !== "LIVE") {
      throw new AuctionError("Auction is not live");
    }
    const now = new Date();
    if (isEnded(now, auction.endAt)) {
      throw new AuctionError("Auction has ended");
    }
    if (auction.sellerId === bidderId) {
      throw new AuctionError("Sellers cannot bid on their own auction");
    }

    const minBid = minimumNextBid(fromCents(auction.currentPriceCents), fromCents(auction.minIncrementCents));
    if (amountCents < minBid) {
      throw new AuctionError(`Bid must be at least ${minBid} cents`);
    }

    const prev = await tx.bid.findFirst({
      where: { auctionId, status: "ACTIVE" },
      orderBy: { amountCents: "desc" }
    });
    const prevAmount = prev ? fromCents(prev.amountCents) : null;

    if (prev && prev.bidderId === bidderId) {
      // Same bidder raising their own bid: free their prior hold first so a
      // fully-reserved bidder can still raise.
      await releaseReserve(tx, bidderId, prevAmount!);
      await tx.bid.update({ where: { id: prev.id }, data: { status: "OUTBID" } });
      await reserveFunds(tx, bidderId, amountCents);
    } else {
      await reserveFunds(tx, bidderId, amountCents);
      if (prev) {
        await tx.bid.update({ where: { id: prev.id }, data: { status: "OUTBID" } });
        await releaseReserve(tx, prev.bidderId, prevAmount!);
      }
    }

    const { extended, newEndAt } = extendedEnd(now, auction.endAt, auction.autoExtendSeconds);

    const bid = await tx.bid.create({
      data: { auctionId, bidderId, amountCents: toCents(amountCents), status: "ACTIVE" }
    });
    await tx.auction.update({
      where: { id: auctionId },
      data: { currentPriceCents: toCents(amountCents), ...(extended ? { endAt: newEndAt } : {}) }
    });

    return { bid, currentPriceCents: amountCents, extended, newEndAt, newEndAtIso: newEndAt.toISOString() };
  });
}

/**
 * Settles an auction that reached its end time. Idempotent: stale or repeated
 * calls (auction already settled, or extended past the job's delay) are no-ops.
 */
export async function settleAuction(auctionId: string): Promise<SettleResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`;

    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      return { settled: false, winnerBidId: null, winnerBidderId: null, winnerAmountCents: null };
    }
    if (auction.status !== "LIVE") {
      return { settled: false, winnerBidId: null, winnerBidderId: null, winnerAmountCents: null };
    }
    if (!isEnded(new Date(), auction.endAt)) {
      // The job fired early (auction was extended after scheduling) — retry later.
      return { settled: false, winnerBidId: null, winnerBidderId: null, winnerAmountCents: null };
    }

    const winner = await tx.bid.findFirst({
      where: { auctionId, status: "ACTIVE" },
      orderBy: { amountCents: "desc" }
    });

    if (winner) {
      await settleReserve(tx, winner.bidderId, fromCents(winner.amountCents), auctionId);
      await tx.bid.update({ where: { id: winner.id }, data: { status: "WON" } });
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: "SETTLED", winningBidId: winner.id }
      });
      await tx.property.update({ where: { id: auction.propertyId }, data: { status: "SOLD" } });

      logger.info(
        { auctionId, winnerBidId: winner.id, winnerBidderId: winner.bidderId, winnerAmountCents: String(winner.amountCents) },
        "auction settled with winner"
      );
      return {
        settled: true,
        winnerBidId: winner.id,
        winnerBidderId: winner.bidderId,
        winnerAmountCents: fromCents(winner.amountCents)
      };
    }

    await tx.auction.update({ where: { id: auctionId }, data: { status: "ENDED" } });
    return { settled: true, winnerBidId: null, winnerBidderId: null, winnerAmountCents: null };
  });
}

export async function getAuction(id: string) {
  return prisma.auction.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          owner: { select: { id: true, name: true } }
        }
      },
      bids: {
        orderBy: { amountCents: "desc" },
        take: 20,
        include: { bidder: { select: { id: true, name: true } } }
      }
    }
  });
}

export type AuctionWithDetail = NonNullable<Awaited<ReturnType<typeof getAuction>>>;
