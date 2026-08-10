/**
 * Money is stored as integer cents (Postgres BIGINT) and surfaced at the
 * API/UI boundary as a plain JS number. All arithmetic happens on safe
 * integers; BigInt conversion happens only at the Prisma boundary.
 */

export const MAX_SAFE_CENTS = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function toCents(value: number): bigint {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Amount is not a safe integer number of cents: ${value}`);
  }
  return BigInt(value);
}

export function fromCents(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new MoneyError(`Cents value exceeds safe integer range: ${value}`);
  }
  return n;
}

export function isPositive(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
