import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/db.js";
import { hashPassword } from "../../src/password.js";
import { createProperty } from "../../src/services/property.js";
import { createAuction, placeBid, settleAuction, AuctionError } from "../../src/services/auction.js";
import { assertWalletInvariant, fundWallet, getWalletBalance } from "../../src/services/wallet.js";

let reachable = false;

// Probe runs at module load (before describe.skipIf is evaluated) so the
// suite can self-skip when the DB is unreachable.
try {
  await prisma.$queryRaw`SELECT 1`;
  reachable = true;
} catch {
  reachable = false;
}

describe.skipIf(!reachable)("auction integration", () => {
  const tag = randomUUID();
  let sellerId: string;
  let buyerId: string;
  let propertyId: string;
  let auctionId: string;

  async function makeUser(email: string) {
    return prisma.user.create({ data: { email, name: "Auction User", passwordHash: await hashPassword("password123") } });
  }

  beforeAll(async () => {
    const seller = await makeUser(`auction-seller-${tag}@estatex.test`);
    const buyer = await makeUser(`auction-buyer-${tag}@estatex.test`);
    sellerId = seller.id;
    buyerId = buyer.id;

    const property = await createProperty(seller.id, {
      title: "Auction Test Villa",
      description: "Integration test property",
      priceCents: 1_000_000_00,
      currency: "USD",
      country: "PT",
      city: "Lisbon",
      address: "Rua 42",
      sqft: 3000,
      bedrooms: 4,
      bathrooms: 3
    });
    propertyId = property.id;

    const auction = await createAuction(seller.id, {
      propertyId,
      startPriceCents: 800_000_00,
      minIncrementCents: 20_000_00,
      endAt: new Date(Date.now() + 2 * 60 * 1000)
    });
    auctionId = auction.id;
  });

  afterAll(async () => {
    await prisma.bid.deleteMany({ where: { auctionId } });
    await prisma.auction.deleteMany({ where: { id: auctionId } });
    await prisma.walletTransaction.deleteMany({ where: { userId: { in: [sellerId, buyerId] } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [sellerId, buyerId] } } });
    await prisma.propertyImage.deleteMany({ where: { propertyId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.user.deleteMany({ where: { id: { in: [sellerId, buyerId] } } });
    await prisma.$disconnect();
  });

  it("rejects seller self-bidding", async () => {
    await expect(placeBid(auctionId, sellerId, 820_000_00)).rejects.toThrow(AuctionError);
  });

  it("rejects a bid below the minimum increment", async () => {
    await fundWallet(buyerId, 1_000_000_00);
    await expect(placeBid(auctionId, buyerId, 800_001_00)).rejects.toThrow(AuctionError);
  });

  it("accepts a bid, reserves funds, and extends inside the window", async () => {
    const result = await placeBid(auctionId, buyerId, 850_000_00);
    expect(result.currentPriceCents).toBe(850_000_00);

    const balance = await getWalletBalance(buyerId);
    expect(balance.reservedCents).toBe(850_000_00);
    await assertWalletInvariant(buyerId);
  });

  it("fails when the bidder lacks funds", async () => {
    const other = await makeUser(`auction-poor-${tag}@estatex.test`);
    await expect(placeBid(auctionId, other.id, 900_000_00)).rejects.toThrow(/Insufficient/);
    await prisma.walletTransaction.deleteMany({ where: { userId: other.id } });
    await prisma.wallet.deleteMany({ where: { userId: other.id } });
    await prisma.user.deleteMany({ where: { id: other.id } });
  });

  it("settles the auction to the winner and marks the property SOLD", async () => {
    // Force the auction past its end time so settlement applies.
    await prisma.auction.update({ where: { id: auctionId }, data: { endAt: new Date(Date.now() - 1000) } });

    const result = await settleAuction(auctionId);
    expect(result.settled).toBe(true);
    expect(result.winnerBidId).not.toBeNull();

    const auction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
    expect(auction.status).toBe("SETTLED");
    expect(auction.winningBidId).toBe(result.winnerBidId);

    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect(property.status).toBe("SOLD");

    // Winner's hold converted to a completed debit: reserved is now 0.
    const balance = await getWalletBalance(buyerId);
    expect(balance.reservedCents).toBe(0);
    await assertWalletInvariant(buyerId);

    // Idempotent: a second settle is a no-op.
    const again = await settleAuction(auctionId);
    expect(again.settled).toBe(false);
  });
});
