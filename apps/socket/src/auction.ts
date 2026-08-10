import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  AUCTION_EVENTS_CHANNEL,
  AUCTION_END_JOB,
  AUCTION_QUEUE,
  auctionEndJobId,
  logger,
  msUntilEnd,
  settleAuction
} from "@estatex/core";

export async function scheduleAuctionEnd(queue: Queue, auctionId: string, endAt: Date): Promise<void> {
  await queue.remove(auctionEndJobId(auctionId));
  await queue.add(
    AUCTION_END_JOB,
    { auctionId },
    { jobId: auctionEndJobId(auctionId), delay: msUntilEnd(endAt), removeOnComplete: true, removeOnFail: 100 }
  );
}

export async function startAuctionWorker(
  redisUrl: string,
  publisher: Redis
): Promise<{ queue: Queue; worker: Worker }> {
  const connection = { url: redisUrl };
  const queue = new Queue(AUCTION_QUEUE, { connection });

  const worker = new Worker(
    AUCTION_QUEUE,
    async (job) => {
      if (job.name !== AUCTION_END_JOB) return;
      const { auctionId } = job.data as { auctionId: string };
      const result = await settleAuction(auctionId);
      logger.info({ auctionId, ...result }, "auction:end job processed");

      await publisher.publish(
        AUCTION_EVENTS_CHANNEL,
        JSON.stringify({
          auctionId,
          type: "AUCTION_ENDED",
          winnerBidId: result.winnerBidId,
          winnerBidderId: result.winnerBidderId,
          winnerAmountCents: result.winnerAmountCents
        })
      );
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "auction job failed");
  });
  worker.on("error", (err) => {
    logger.error({ err }, "auction worker error");
  });

  return { queue, worker };
}
