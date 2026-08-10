import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { Queue } from "bullmq";
import { AUCTION_EVENTS_CHANNEL, type AuctionEvent, logger, prisma } from "@estatex/core";
import { Redis } from "ioredis";
import { scheduleAuctionEnd, startAuctionWorker } from "./auction.js";
import { startDividendWorker } from "./dividends.js";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "socket", pid: process.pid }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

const io = new Server(httpServer, {
  cors: { origin: WEB_ORIGIN, methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "socket connected");

  socket.on("auction:join", (auctionId: string) => {
    if (typeof auctionId === "string" && auctionId.trim().length > 0) {
      socket.join(`auction:${auctionId.trim()}`);
      logger.debug({ socketId: socket.id, auctionId: auctionId.trim() }, "joined auction room");
    }
  });

  socket.on("auction:leave", (auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
  });

  socket.on("disconnect", (reason) => {
    logger.debug({ socketId: socket.id, reason }, "socket disconnected");
  });
});

const publisher = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

subscriber.subscribe(AUCTION_EVENTS_CHANNEL, (err) => {
  if (err) {
    logger.error({ err }, "failed to subscribe to auction events channel");
  } else {
    logger.debug("subscribed to auction events channel");
  }
});

subscriber.on("message", async (channel, message) => {
  if (channel !== AUCTION_EVENTS_CHANNEL) return;
  try {
    const event = JSON.parse(message) as AuctionEvent;
    if (typeof event?.auctionId !== "string" || event.auctionId.length === 0) return;

    // Keep the delayed end job in sync with the latest known end time.
    if (endQueue) {
      if (event.type === "AUCTION_STARTED") {
        await scheduleAuctionEnd(endQueue, event.auctionId, new Date(event.endAt));
      } else if (event.type === "BID") {
        await scheduleAuctionEnd(endQueue, event.auctionId, new Date(event.newEndAt));
      }
    }

    io.to(`auction:${event.auctionId}`).emit("auction:event", event);
    logger.debug({ auctionId: event.auctionId, type: event.type }, "relayed auction event");
  } catch (err) {
    logger.warn({ err, channel, message }, "failed to process auction event");
  }
});

let endQueue: Queue | undefined;

startAuctionWorker(REDIS_URL, publisher)
  .then(({ queue }) => {
    endQueue = queue;
    logger.info("auction worker started");
  })
  .catch((err) => {
    logger.error({ err }, "auction worker failed to start");
  });

startDividendWorker(REDIS_URL).catch((err) => {
  logger.error({ err }, "dividend worker failed to start");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "shutting down socket server");
  subscriber.disconnect();
  publisher.disconnect();
  io.close();
  httpServer.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, "socket server listening");
});
