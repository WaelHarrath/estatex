import type { Prisma } from "../../generated/prisma/client.js";
import type { WalletTxType } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { fromCents, toCents } from "../money.js";

export type Tx = Prisma.TransactionClient;

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export interface WalletOp {
  userId: string;
  /** Positive credits available balance; negative debits it. Never touches reserved. */
  amountCents: number;
  type: WalletTxType;
  referenceId?: string;
  note?: string;
}

export interface WalletBalance {
  availableCents: number;
  reservedCents: number;
}

async function ensureWallet(client: Tx, userId: string) {
  return client.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

/**
 * Applies a wallet ledger operation inside a transaction. Debits fail
 * atomically when available funds are insufficient (enforced via UPDATE ...
 * WHERE, so concurrent operations cannot double-spend).
 */
export async function applyWalletOp(client: Tx, op: WalletOp): Promise<void> {
  const amount = toCents(op.amountCents);
  if (amount === 0n) {
    throw new WalletError("Wallet operation amount must be non-zero");
  }
  if (amount > 0n) {
    // Credits may target a user without an existing wallet (e.g. a share
    // seller who has never funded). Create it first so the UPDATE matches.
    await ensureWallet(client, op.userId);
  }
  const required = amount < 0n ? -amount : 0n;
  const result = await client.wallet.updateMany({
    where: { userId: op.userId, availableCents: { gte: required } },
    data: { availableCents: { increment: amount } }
  });
  if (result.count !== 1) {
    throw new WalletError("Insufficient available funds");
  }
  await client.walletTransaction.create({
    data: {
      userId: op.userId,
      type: op.type,
      amountCents: amount,
      referenceId: op.referenceId,
      note: op.note
    }
  });
}

/** Standalone credit/debit that opens its own transaction (e.g. funding). */
export async function fundWallet(
  userId: string,
  amountCents: number,
  opts?: { referenceId?: string; note?: string }
): Promise<WalletBalance> {
  if (amountCents <= 0) {
    throw new WalletError("Funding amount must be positive");
  }
  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);
    await applyWalletOp(tx, {
      userId,
      amountCents,
      type: "FUND",
      referenceId: opts?.referenceId,
      note: opts?.note
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return { availableCents: fromCents(wallet.availableCents), reservedCents: fromCents(wallet.reservedCents) };
  });
}

export async function getWalletBalance(userId: string): Promise<WalletBalance> {
  const wallet = await ensureWallet(prisma, userId);
  return { availableCents: fromCents(wallet.availableCents), reservedCents: fromCents(wallet.reservedCents) };
}

/**
 * Locks funds for an auction bid: moves amount from available to reserved.
 * Fails atomically if available is insufficient.
 */
export async function reserveFunds(client: Tx, userId: string, amountCents: number): Promise<void> {
  const amount = toCents(amountCents);
  if (amount <= 0n) {
    throw new WalletError("Reserve amount must be positive");
  }
  const result = await client.wallet.updateMany({
    where: { userId, availableCents: { gte: amount } },
    data: { availableCents: { decrement: amount }, reservedCents: { increment: amount } }
  });
  if (result.count !== 1) {
    throw new WalletError("Insufficient available funds to reserve bid");
  }
  await client.walletTransaction.create({
    data: {
      userId,
      type: "AUCTION_RESERVE",
      amountCents: amount,
      note: "Bid funds placed on hold"
    }
  });
}

/** Releases a previously reserved amount back to available. */
export async function releaseReserve(client: Tx, userId: string, amountCents: number): Promise<void> {
  const amount = toCents(amountCents);
  if (amount <= 0n) {
    throw new WalletError("Release amount must be positive");
  }
  const result = await client.wallet.updateMany({
    where: { userId, reservedCents: { gte: amount } },
    data: { availableCents: { increment: amount }, reservedCents: { decrement: amount } }
  });
  if (result.count !== 1) {
    throw new WalletError("No reserved funds to release");
  }
  await client.walletTransaction.create({
    data: {
      userId,
      type: "AUCTION_RELEASE",
      amountCents: amount,
      note: "Bid hold released"
    }
  });
}

/** Converts a reserved hold into a completed purchase debit (winner settlement). */
export async function settleReserve(client: Tx, userId: string, amountCents: number, referenceId?: string): Promise<void> {
  const amount = toCents(amountCents);
  if (amount <= 0n) {
    throw new WalletError("Settlement amount must be positive");
  }
  const result = await client.wallet.updateMany({
    where: { userId, reservedCents: { gte: amount } },
    data: { reservedCents: { decrement: amount } }
  });
  if (result.count !== 1) {
    throw new WalletError("No reserved funds to settle");
  }
  await client.walletTransaction.create({
    data: {
      userId,
      type: "AUCTION_WIN_DEBIT",
      amountCents: -amount,
      referenceId,
      note: "Auction won — held bid applied to purchase"
    }
  });
}

/**
 * Wallet integrity invariant: the sum of equity-changing ledger entries must
 * equal the wallet balance. AUCTION_RESERVE and AUCTION_RELEASE are internal
 * transfers between available and reserved — they change neither the wallet
 * total nor the user's equity, so they are excluded from the equity sum.
 */
export async function assertWalletInvariant(userId: string): Promise<void> {
  const wallet = await ensureWallet(prisma, userId);
  const agg = await prisma.walletTransaction.aggregate({
    where: { userId, type: { notIn: ["AUCTION_RESERVE", "AUCTION_RELEASE"] } },
    _sum: { amountCents: true }
  });
  const ledger = agg._sum.amountCents ?? 0n;
  const balance = wallet.availableCents + wallet.reservedCents;
  if (ledger !== balance) {
    logger.error(
      { userId, ledger: String(ledger), balance: String(balance) },
      "wallet invariant violated: ledger sum does not match balance"
    );
    throw new WalletError("Wallet invariant violated");
  }
}

/** Recent wallet ledger entries for a user, newest first (action history). */
export async function listWalletTransactions(
  userId: string,
  limit = 50
): Promise<
  Array<{
    id: string;
    type: WalletTxType;
    amountCents: bigint;
    note: string | null;
    referenceId: string | null;
    createdAt: Date;
  }>
> {
  const rows = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: r.amountCents,
    note: r.note,
    referenceId: r.referenceId,
    createdAt: r.createdAt
  }));
}
