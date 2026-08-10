import {
  buySharesSchema,
  createShareProgramSchema,
  declareDividendSchema,
  postShareAskSchema,
  type BuySharesInput,
  type CreateShareProgramInput,
  type DeclareDividendInput,
  type PostShareAskInput
} from "../contracts.js";
import { prisma } from "../db.js";
import { fromCents, toCents } from "../money.js";
import { logger } from "../logger.js";
import { applyWalletOp } from "./wallet.js";

export class SharesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SharesError";
  }
}

const MAX_TOTAL_CENTS = Number.MAX_SAFE_INTEGER;

/**
 * Creates a share program for a property owned by the seller. The owner
 * receives a holding of every share (100% initially) and can then sell units
 * by posting asks.
 */
export async function createShareProgram(sellerId: string, input: CreateShareProgramInput) {
  const data = createShareProgramSchema.parse(input);

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw new SharesError("Property not found");
  }
  if (property.ownerId !== sellerId) {
    throw new SharesError("Only the property owner can create a share program");
  }
  const existing = await prisma.shareProgram.findUnique({ where: { propertyId: property.id } });
  if (existing) {
    throw new SharesError("This property already has a share program");
  }

  const priceTotal = data.totalShares * data.pricePerShareCents;
  if (priceTotal > MAX_TOTAL_CENTS) {
    throw new SharesError("Share pricing exceeds supported range");
  }

  return prisma.$transaction(async (tx) => {
    const program = await tx.shareProgram.create({
      data: {
        propertyId: property.id,
        totalShares: data.totalShares,
        issuedShares: data.totalShares,
        pricePerShareCents: toCents(data.pricePerShareCents),
        status: "ACTIVE"
      }
    });
    await tx.shareHolding.create({
      data: { programId: program.id, ownerId: sellerId, units: data.totalShares }
    });
    return program;
  });
}

/** Posts an ask backed by the seller's current holding. */
export async function postShareAsk(sellerId: string, input: PostShareAskInput) {
  const data = postShareAskSchema.parse(input);

  const program = await prisma.shareProgram.findUnique({ where: { id: data.programId } });
  if (!program) {
    throw new SharesError("Share program not found");
  }
  if (program.status !== "ACTIVE") {
    throw new SharesError("Share program is not active");
  }

  const holding = await prisma.shareHolding.findUnique({
    where: { programId_ownerId: { programId: program.id, ownerId: sellerId } }
  });
  if (!holding) {
    throw new SharesError("You do not hold shares in this program");
  }

  const openAsks = await prisma.shareAsk.aggregate({
    where: { programId: program.id, sellerId, status: "OPEN" },
    _sum: { unitsLeft: true }
  });
  const committed = openAsks._sum.unitsLeft ?? 0;
  if (holding.units - committed < data.units) {
    throw new SharesError("Not enough units available in your holding");
  }

  return prisma.shareAsk.create({
    data: {
      programId: program.id,
      sellerId,
      units: data.units,
      unitsLeft: data.units,
      pricePerUnitCents: program.pricePerShareCents,
      status: "OPEN"
    }
  });
}

/**
 * Buys units from an ask. The ask row is locked for the transaction so
 * concurrent buyers are processed serially and cannot oversell a single ask.
 */
export async function buyShares(buyerId: string, input: BuySharesInput) {
  const data = buySharesSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ShareAsk" WHERE id = ${data.askId} FOR UPDATE`;

    const ask = await tx.shareAsk.findUnique({ where: { id: data.askId }, include: { program: true } });
    if (!ask) {
      throw new SharesError("Ask not found");
    }
    if (ask.status !== "OPEN") {
      throw new SharesError("Ask is no longer open");
    }
    if (ask.unitsLeft < data.units) {
      throw new SharesError("Not enough units available on this ask");
    }
    if (ask.sellerId === buyerId) {
      throw new SharesError("You cannot buy from your own ask");
    }
    if (ask.program.status !== "ACTIVE") {
      throw new SharesError("Share program is not active");
    }

    const priceCents = data.units * fromCents(ask.pricePerUnitCents);
    if (priceCents > MAX_TOTAL_CENTS) {
      throw new SharesError("Purchase exceeds supported range");
    }

    // Funds flow: buyer debited, seller credited, atomically.
    await applyWalletOp(tx, { userId: buyerId, amountCents: -priceCents, type: "SHARE_PURCHASE", referenceId: ask.id });
    await applyWalletOp(tx, { userId: ask.sellerId, amountCents: priceCents, type: "SHARE_SALE", referenceId: ask.id });

    const left = ask.unitsLeft - data.units;
    await tx.shareAsk.update({
      where: { id: ask.id },
      data: { unitsLeft: left, ...(left === 0 ? { status: "FILLED" } : {}) }
    });

    await tx.shareHolding.upsert({
      where: { programId_ownerId: { programId: ask.programId, ownerId: buyerId } },
      update: { units: { increment: data.units } },
      create: { programId: ask.programId, ownerId: buyerId, units: data.units }
    });

    const sellerHolding = await tx.shareHolding.findUnique({
      where: { programId_ownerId: { programId: ask.programId, ownerId: ask.sellerId } }
    });
    if (sellerHolding) {
      const newUnits = sellerHolding.units - data.units;
      if (newUnits <= 0) {
        await tx.shareHolding.delete({ where: { id: sellerHolding.id } });
      } else {
        await tx.shareHolding.update({ where: { id: sellerHolding.id }, data: { units: newUnits } });
      }
    }

    return { units: data.units, priceCents };
  });
}

/** Declares a dividend for all current shareholders. */
export async function declareDividend(actorId: string, input: DeclareDividendInput) {
  const data = declareDividendSchema.parse(input);

  const program = await prisma.shareProgram.findUnique({
    where: { id: data.programId },
    include: { property: { select: { ownerId: true } } }
  });
  if (!program) {
    throw new SharesError("Share program not found");
  }
  if (program.status !== "ACTIVE") {
    throw new SharesError("Share program is not active");
  }
  if (program.property.ownerId !== actorId) {
    throw new SharesError("Only the property owner can declare dividends");
  }

  const holdings = await prisma.shareHolding.findMany({ where: { programId: program.id } });
  const totalUnits = holdings.reduce((sum, h) => sum + h.units, 0);
  if (totalUnits <= 0) {
    throw new SharesError("No shareholders to pay");
  }

  const totalAmountCents = totalUnits * data.perShareCents;
  if (totalAmountCents > MAX_TOTAL_CENTS) {
    throw new SharesError("Dividend exceeds supported range");
  }

  return prisma.dividend.create({
    data: {
      programId: program.id,
      perShareCents: toCents(data.perShareCents),
      totalAmountCents: toCents(totalAmountCents),
      status: "PENDING"
    }
  });
}

/** Idempotent payout: credits every current shareholder their unit share. */
export async function processDividendPayout(dividendId: string): Promise<{ processed: boolean; totalPayout: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Dividend" WHERE id = ${dividendId} FOR UPDATE`;

    const dividend = await tx.dividend.findUnique({ where: { id: dividendId } });
    if (!dividend || dividend.status !== "PENDING") {
      return { processed: false, totalPayout: 0 };
    }

    const holdings = await tx.shareHolding.findMany({ where: { programId: dividend.programId } });

    let total = 0n;
    for (const holding of holdings) {
      const amount = BigInt(holding.units) * dividend.perShareCents;
      if (Number(amount) > MAX_TOTAL_CENTS) {
        throw new SharesError("Payout exceeds supported range");
      }
      await tx.dividendPayout.create({
        data: {
          dividendId,
          ownerId: holding.ownerId,
          units: holding.units,
          amountCents: amount
        }
      });
      await applyWalletOp(tx, {
        userId: holding.ownerId,
        amountCents: Number(amount),
        type: "DIVIDEND",
        referenceId: dividendId
      });
      total += amount;
    }

    await tx.dividend.update({ where: { id: dividendId }, data: { status: "PAID", paidAt: new Date() } });
    logger.info({ dividendId, totalPayout: String(total) }, "dividend payout completed");
    return { processed: true, totalPayout: Number(total) };
  });
}

export async function getShareProgram(id: string) {
  return prisma.shareProgram.findUnique({
    where: { id },
    include: {
      property: { include: { images: { orderBy: { sortOrder: "asc" } }, owner: { select: { id: true, name: true } } } },
      asks: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "asc" },
        include: { seller: { select: { id: true, name: true } } }
      },
      holdings: {
        select: { ownerId: true, units: true, owner: { select: { name: true } } },
        orderBy: { units: "desc" }
      },
      dividends: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
}

export type ShareProgramDetail = NonNullable<Awaited<ReturnType<typeof getShareProgram>>>;

/** A user's share holdings with their program + property context (profile page). */
export async function listUserHoldings(userId: string) {
  return prisma.shareHolding.findMany({
    where: { ownerId: userId },
    include: {
      program: {
        include: {
          property: { include: { images: { orderBy: { sortOrder: "asc" } } } }
        }
      }
    },
    orderBy: { program: { createdAt: "desc" } }
  });
}

export type UserHolding = Awaited<ReturnType<typeof listUserHoldings>>[number];
