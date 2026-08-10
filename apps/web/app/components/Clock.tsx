"use client";

import { useEffect, useState } from "react";

/** Live UTC clock in ledger mono — the header's proof that the market is open. */
export default function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toISOString().slice(11, 19)
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className="figure text-xs text-cadastral-soft">UTC ——:——:——</span>;
  }

  return (
    <span className="figure text-xs tracking-widest text-cadastral-soft" aria-label="Current UTC time">
      UTC {now}
    </span>
  );
}
