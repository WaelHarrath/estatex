/**
 * Pure auction rules, extracted for unit testing. All amounts are integer
 * cents.
 */

export function minimumNextBid(currentPriceCents: number, minIncrementCents: number): number {
  return currentPriceCents + minIncrementCents;
}

/** Anti-sniping: any bid landing inside the extension window bumps the end time. */
export function shouldExtend(now: Date, endAt: Date, autoExtendSeconds: number): boolean {
  return now.getTime() >= endAt.getTime() - autoExtendSeconds * 1000;
}

export interface Extension {
  extended: boolean;
  newEndAt: Date;
}

export function extendedEnd(now: Date, endAt: Date, autoExtendSeconds: number): Extension {
  const extended = shouldExtend(now, endAt, autoExtendSeconds);
  return {
    extended,
    newEndAt: extended ? new Date(now.getTime() + autoExtendSeconds * 1000) : endAt
  };
}

export function isEnded(now: Date, endAt: Date): boolean {
  return now.getTime() >= endAt.getTime();
}
