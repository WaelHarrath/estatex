import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  DIVIDEND_PAYOUT_JOB,
  DIVIDEND_QUEUE,
  DIVIDENDS_CHANNEL,
  logger,
  processDividendPayout
} from "@estatex/core";

/**
 * Listens for DIVIDEND_DECLARED events (published by the web app), enqueues a
 * payout job, and processes it: credits every current shareholder.
 */
export async function startDividendWorker(redisUrl: string): Promise<void> {
  const connection = { url: redisUrl };
  const queue = new Queue(DIVIDEND_QUEUE, { connection });

  const worker = new Worker(
    DIVIDEND_QUEUE,
    async (job) => {
      if (job.name !== DIVIDEND_PAYOUT_JOB) return;
      const { dividendId } = job.data as { dividendId: string };
      const result = await processDividendPayout(dividendId);
      logger.info({ dividendId, ...result }, "dividend payout job processed");
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "dividend job failed");
  });
  worker.on("error", (err) => {
    logger.error({ err }, "dividend worker error");
  });

  const subscriber = new Redis(redisUrl);
  await subscriber.subscribe(DIVIDENDS_CHANNEL);
  subscriber.on("message", async (channel, message) => {
    if (channel !== DIVIDENDS_CHANNEL) return;
    try {
      const event = JSON.parse(message) as { dividendId: string; type: string };
      if (event?.type === "DIVIDEND_DECLARED" && event.dividendId) {
        await queue.add(DIVIDEND_PAYOUT_JOB, { dividendId: event.dividendId }, { removeOnComplete: true, removeOnFail: 100 });
        logger.info({ dividendId: event.dividendId }, "dividend payout enqueued");
      }
    } catch (err) {
      logger.warn({ err, message }, "failed to process dividend event");
    }
  });
}
