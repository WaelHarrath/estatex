"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { AuctionEvent } from "@estatex/core";
import { placeBidAction } from "../actions";
import { formatMoney } from "@/src/format";
import Stamp from "@/app/components/Stamp";

export interface LiveBid {
  id: string;
  bidderId: string;
  bidderName: string;
  amountCents: number;
  createdAt: string;
}

interface AuctionRoomProps {
  auctionId: string;
  sellerId: string;
  currentUserId: string | null;
  currentPriceCents: number;
  minIncrementCents: number;
  endAtIso: string;
  status: string;
  initialBids: LiveBid[];
}

function toCents(dollars: string): number | null {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function AuctionRoom(props: AuctionRoomProps) {
  const [currentPriceCents, setCurrentPriceCents] = useState(props.currentPriceCents);
  const [endAt, setEndAt] = useState(() => new Date(props.endAtIso));
  const [status, setStatus] = useState(props.status);
  const [winnerAmountCents, setWinnerAmountCents] = useState<number | null>(null);
  const [winnerBidderId, setWinnerBidderId] = useState<string | null>(null);
  const [bids, setBids] = useState<LiveBid[]>(props.initialBids);
  const [now, setNow] = useState(() => Date.now());
  const [bidInput, setBidInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("auction:join", props.auctionId));
    socket.on("auction:event", (event: AuctionEvent) => {
      if (event.auctionId !== props.auctionId) return;
      if (event.type === "BID") {
        setCurrentPriceCents(event.currentPriceCents);
        setEndAt(new Date(event.newEndAt));
        setBids((prev) =>
          [
            {
              id: event.bidId,
              bidderId: event.bidderId,
              bidderName: event.bidderId === props.currentUserId ? "You" : "Live bidder",
              amountCents: event.currentPriceCents,
              createdAt: new Date().toISOString()
            },
            ...prev
          ].slice(0, 20)
        );
      } else if (event.type === "AUCTION_ENDED") {
        setStatus("ENDED");
        setWinnerAmountCents(event.winnerAmountCents);
        setWinnerBidderId(event.winnerBidderId);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.auctionId, props.currentUserId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const minBidCents = currentPriceCents + props.minIncrementCents;
  const isSeller = props.currentUserId === props.sellerId;
  const canBid = Boolean(props.currentUserId) && !isSeller && status === "LIVE";
  const remainingMs = endAt.getTime() - now;
  const isEnded = status !== "LIVE";
  const urgent = remainingMs < 30_000 && status === "LIVE";

  async function submitBid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = toCents(bidInput);
    if (parsed === null || parsed < minBidCents) {
      setError(`Your bid must be at least ${formatMoney(BigInt(minBidCents))}`);
      return;
    }
    setPending(true);
    setError(null);
    const result = await placeBidAction(props.auctionId, parsed);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setBidInput("");
    setCurrentPriceCents(result.currentPriceCents);
    setEndAt(new Date(result.newEndAt));
    setPending(false);
  }

  return (
    <div className="glass keyline corner relative overflow-hidden rounded-lg">
      <span className="crosshair left-3 top-3" aria-hidden />
      <span className="crosshair right-3 bottom-3" aria-hidden />

      <div className="relative p-6 sm:p-8">
        {/* The reading: price, clock, state */}
        <div className="grid gap-6 border-b border-hairline pb-6 sm:grid-cols-2">
          <div>
            <p className="figure text-[0.6rem] uppercase tracking-[0.24em] text-ink-soft">Current price</p>
            <p className="figure mt-1 text-4xl font-medium tracking-tight text-gold-bright sm:text-5xl">
              {formatMoney(BigInt(currentPriceCents))}
            </p>
            <p className="figure mt-2 text-xs tracking-[0.12em] text-ink-soft">
              Min. next bid {formatMoney(BigInt(minBidCents))}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="figure text-[0.6rem] uppercase tracking-[0.24em] text-ink-soft">Time remaining</p>
            <p className={`figure mt-1 text-4xl font-medium tracking-tight sm:text-5xl ${urgent ? "text-ember" : "text-ink"}`}>
              {isEnded ? "Ended" : formatRemaining(remainingMs)}
            </p>
            <div className="mt-3 sm:flex sm:justify-end">
              {status === "LIVE" ? <Stamp>Live</Stamp> : <Stamp tone="ink">Ended</Stamp>}
            </div>
          </div>
        </div>

        {status === "ENDED" && (
          <div className="mt-5 border border-hairline bg-panel p-4 text-sm">
            {winnerAmountCents !== null ? (
              <p className="text-ink">
                <span className="font-semibold">
                  {winnerBidderId === props.currentUserId ? "You won" : "Lot sold"}
                </span>{" "}
                at{" "}
                <span className="figure font-medium text-gold">
                  {formatMoney(BigInt(winnerAmountCents))}
                </span>
                .
              </p>
            ) : (
              <p className="text-ink-soft">Auction ended with no winning bid. The lot remains on the board.</p>
            )}
          </div>
        )}

        {/* The bid desk */}
        <form onSubmit={submitBid} className="mt-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="bid" className="figure block text-[0.62rem] uppercase tracking-[0.22em] text-ink-soft">
              Your bid
            </label>
            <input
              id="bid"
              type="number"
              step="0.01"
              min={minBidCents / 100}
              value={bidInput}
              onChange={(e) => setBidInput(e.target.value)}
              disabled={!canBid || pending}
              placeholder={`Min ${(minBidCents / 100).toFixed(2)}`}
              className="figure mt-1 w-full border border-hairline bg-abyss-deep px-3 py-2.5 text-lg text-ink placeholder:text-ink-soft/50 focus:border-gold focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!canBid || pending}
            className="btn-primary disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? "Placing bid…" : "Place bid"}
          </button>
        </form>
        {!props.currentUserId && <p className="mt-3 text-sm text-ink-soft">Sign in to bid.</p>}
        {isSeller && status === "LIVE" && <p className="mt-3 text-sm text-ink-soft">You are the seller of this property.</p>}
        {error && <p className="mt-3 text-sm text-ember">{error}</p>}

        {/* The bid log */}
        <div className="mt-9">
          <div className="flex items-baseline justify-between border-b border-hairline pb-2">
            <h2 className="figure text-[0.62rem] uppercase tracking-[0.26em] text-ink-soft">Bid log</h2>
            <span className="figure text-[0.62rem] text-ink-soft">{bids.length} recorded</span>
          </div>
          {bids.length === 0 ? (
            <p className="mt-4 border border-dashed border-hairline bg-panel/40 p-6 text-sm text-ink-soft">
              No bids yet — the floor is quiet. Be the first to speak.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-hairline">
              {bids.map((bid) => {
                const mine = bid.bidderId === props.currentUserId;
                return (
                  <li key={bid.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                    <span className={`flex items-center gap-2 ${mine ? "text-gold" : "text-ink-soft"}`}>
                      {mine ? (
                        <Stamp tone="cadastral">You</Stamp>
                      ) : (
                        <span className="figure text-xs text-ink-soft">▸</span>
                      )}
                      {bid.bidderName}
                    </span>
                    <span className={`figure font-medium ${mine ? "text-gold-bright" : "text-ink"}`}>
                      {formatMoney(BigInt(bid.amountCents))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
