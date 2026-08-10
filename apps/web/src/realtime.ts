import { Redis } from "ioredis";
import { AUCTION_EVENTS_CHANNEL, DIVIDENDS_CHANNEL, type AuctionEvent, type DividendEvent } from "@estatex/core";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(redisUrl);
  }
  return publisher;
}

/** Publishes an auction event; the socket process relays it to rooms. */
export async function publishAuctionEvent(event: AuctionEvent): Promise<void> {
  await getPublisher().publish(AUCTION_EVENTS_CHANNEL, JSON.stringify(event));
}

/** Publishes a dividend event; the socket process enqueues the payout job. */
export async function publishDividendEvent(event: DividendEvent): Promise<void> {
  await getPublisher().publish(DIVIDENDS_CHANNEL, JSON.stringify(event));
}
