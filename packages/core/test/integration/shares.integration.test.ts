import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/db.js";
import { hashPassword } from "../../src/password.js";
import { createProperty } from "../../src/services/property.js";
import {
  buyShares,
  createShareProgram,
  declareDividend,
  postShareAsk,
  processDividendPayout
} from "../../src/services/shares.js";
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

describe.skipIf(!reachable)("shares integration", () => {
  const tag = randomUUID();
  let ownerId: string;
  let buyerId: string;
  let propertyId: string;
  let programId: string;

  async function makeUser(email: string) {
    return prisma.user.create({ data: { email, name: "Shares User", passwordHash: await hashPassword("password123") } });
  }

  beforeAll(async () => {
    const owner = await makeUser(`shares-owner-${tag}@estatex.test`);
    const buyer = await makeUser(`shares-buyer-${tag}@estatex.test`);
    ownerId = owner.id;
    buyerId = buyer.id;

    const property = await createProperty(owner.id, {
      title: "Shares Test Condo",
      description: "Integration test property",
      priceCents: 600_000_00,
      currency: "USD",
      country: "AE",
      city: "Dubai",
      address: "Marina 7",
      sqft: 1500,
      bedrooms: 2,
      bathrooms: 2
    });
    propertyId = property.id;
  });

  afterAll(async () => {
    await prisma.dividendPayout.deleteMany({ where: { dividend: { programId } } });
    await prisma.dividend.deleteMany({ where: { programId } });
    await prisma.shareAsk.deleteMany({ where: { programId } });
    await prisma.shareHolding.deleteMany({ where: { programId } });
    await prisma.shareProgram.deleteMany({ where: { id: programId } });
    await prisma.walletTransaction.deleteMany({ where: { userId: { in: [ownerId, buyerId] } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [ownerId, buyerId] } } });
    await prisma.propertyImage.deleteMany({ where: { propertyId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, buyerId] } } });
    await prisma.$disconnect();
  });

  it("creates a program and gives the owner the full holding", async () => {
    const program = await createShareProgram(ownerId, {
      propertyId,
      totalShares: 1000,
      pricePerShareCents: 60_000 // $600 per share
    });
    programId = program.id;
    const holding = await prisma.shareHolding.findUniqueOrThrow({
      where: { programId_ownerId: { programId, ownerId } }
    });
    expect(holding.units).toBe(1000);
  });

  it("posts an ask and buys units, moving wallet funds and holdings", async () => {
    const ask = await postShareAsk(ownerId, { programId, units: 100 });
    await fundWallet(buyerId, 600_000); // $6,000

    const result = await buyShares(buyerId, { askId: ask.id, units: 10 });
    expect(result.units).toBe(10);
    // 10 units × $600/share = $6,000 = 600,000 cents.
    expect(result.priceCents).toBe(600_000);

    const buyerHolding = await prisma.shareHolding.findUniqueOrThrow({
      where: { programId_ownerId: { programId, ownerId: buyerId } }
    });
    expect(buyerHolding.units).toBe(10);

    const ownerHolding = await prisma.shareHolding.findUniqueOrThrow({
      where: { programId_ownerId: { programId, ownerId } }
    });
    expect(ownerHolding.units).toBe(990);

    expect((await getWalletBalance(buyerId)).availableCents).toBe(0);
    await assertWalletInvariant(buyerId);
  });

  it("declares and pays a dividend to all shareholders", async () => {
    const dividend = await declareDividend(ownerId, { programId, perShareCents: 100 });
    const result = await processDividendPayout(dividend.id);
    expect(result.processed).toBe(true);

    const totalUnits = 1000;
    expect(result.totalPayout).toBe(totalUnits * 100);

    // Owner: $6,000 sale proceeds + 990 units × $1 dividend.
    const ownerBalance = await getWalletBalance(ownerId);
    expect(ownerBalance.availableCents).toBe(600_000 + 990 * 100);
    await assertWalletInvariant(ownerId);

    // Idempotent: a second payout is a no-op.
    const again = await processDividendPayout(dividend.id);
    expect(again.processed).toBe(false);
  });
});
