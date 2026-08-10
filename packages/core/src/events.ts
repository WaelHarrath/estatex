/**
 * Shared event contracts between the web app (publisher) and the socket
 * relay. The socket process forwards these to Socket.IO rooms verbatim —
 * it never interprets them.
 */
export const AUCTION_EVENTS_CHANNEL = "events:auction";

export type AuctionEvent =
  | {
      auctionId: string;
      type: "AUCTION_STARTED";
      startPriceCents: number;
      endAt: string;
    }
  | {
      auctionId: string;
      type: "BID";
      bidId: string;
      bidderId: string;
      amountCents: number;
      currentPriceCents: number;
      extended: boolean;
      newEndAt: string;
    }
  | {
      auctionId: string;
      type: "AUCTION_ENDED";
      winnerBidId: string | null;
      winnerBidderId: string | null;
      winnerAmountCents: number | null;
    };

export type AuctionEventType = AuctionEvent["type"];

export const DIVIDENDS_CHANNEL = "events:dividend";
export const DIVIDEND_QUEUE = "dividend";
export const DIVIDEND_PAYOUT_JOB = "dividend:payout";

export type DividendEvent = {
  dividendId: string;
  type: "DIVIDEND_DECLARED";
};

/** BullMQ queue + job naming shared between the web publisher and socket worker. */
export const AUCTION_QUEUE = "auction";
export const AUCTION_END_JOB = "auction:end";

export function auctionEndJobId(auctionId: string): string {
  return `auction:end:${auctionId}`;
}

export function msUntilEnd(endAt: Date): number {
  return Math.max(0, endAt.getTime() - Date.now());
}
