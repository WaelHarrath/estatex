"use client";

import { useEffect, useState } from "react";

function fmt(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Live countdown to an auction's end, in ledger mono. */
export default function Countdown({ endAt, className = "" }: { endAt: string; className?: string }) {
  const [label, setLabel] = useState<string>("--:--:--");

  useEffect(() => {
    const end = new Date(endAt).getTime();
    const tick = () => setLabel(fmt(Math.max(0, Math.round((end - Date.now()) / 1000))));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return (
    <span className={`figure tabular-nums ${className}`} aria-label="Time remaining in auction">
      {label}
    </span>
  );
}
