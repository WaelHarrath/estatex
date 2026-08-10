/**
 * DB-backed integration tests. They self-skip when Postgres is unreachable
 * (e.g. Docker not running), so the suite stays green in offline CI while
 * still covering the full flow once the stack is up.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/db.js";
import { hashPassword } from "../../src/password.js";
import {
  applyWalletOp,
  assertWalletInvariant,
  fundWallet,
  getWalletBalance,
  releaseReserve,
  reserveFunds,
  settleReserve,
  WalletError
} from "../../src/services/wallet.js";

let reachable = false;

// Probe runs at module load (before describe.skipIf is evaluated) so the
// suite can self-skip when the DB is unreachable.
try {
  await prisma.$queryRaw`SELECT 1`;
  reachable = true;
} catch {
  reachable = false;
}

describe.skipIf(!reachable)("wallet integration", () => {
  const email = `wallet-test-${randomUUID()}@estatex.test`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email, name: "Wallet Test", passwordHash: await hashPassword("password123") }
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("funds a wallet and records a ledger entry", async () => {
    const balance = await fundWallet(userId, 500_00);
    expect(balance).toEqual({ availableCents: 500_00, reservedCents: 0 });
    await assertWalletInvariant(userId);
  });

  it("rejects negative funding", async () => {
    await expect(fundWallet(userId, 0)).rejects.toThrow(WalletError);
  });

  it("debits and enforces sufficient funds atomically", async () => {
    await prisma.$transaction(async (tx) => {
      await applyWalletOp(tx, { userId, amountCents: -200_00, type: "ADMIN_ADJUST", note: "test debit" });
    });
    expect((await getWalletBalance(userId)).availableCents).toBe(300_00);
    await assertWalletInvariant(userId);

    await expect(
      prisma.$transaction(async (tx) => {
        await applyWalletOp(tx, { userId, amountCents: -10_000_00, type: "ADMIN_ADJUST", note: "overdraft" });
      })
    ).rejects.toThrow(WalletError);
  });

  it("reserves, releases and settles bid holds", async () => {
    await prisma.$transaction(async (tx) => {
      await reserveFunds(tx, userId, 100_00);
    });
    expect((await getWalletBalance(userId)).reservedCents).toBe(100_00);
    await assertWalletInvariant(userId);

    // Over-reserving beyond available must fail (available is 200_00 now).
    await expect(
      prisma.$transaction(async (tx) => {
        await reserveFunds(tx, userId, 500_00);
      })
    ).rejects.toThrow(WalletError);

    await prisma.$transaction(async (tx) => {
      await releaseReserve(tx, userId, 40_00);
    });
    expect((await getWalletBalance(userId))).toEqual({ availableCents: 240_00, reservedCents: 60_00 });
    await assertWalletInvariant(userId);

    await prisma.$transaction(async (tx) => {
      await settleReserve(tx, userId, 60_00, "auction-test");
    });
    const final = await getWalletBalance(userId);
    expect(final).toEqual({ availableCents: 240_00, reservedCents: 0 });
    await assertWalletInvariant(userId);
  });
});
