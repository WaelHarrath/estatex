"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function FundConfirm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const ran = useRef(false);
  const [status, setStatus] = useState<"pending" | "credited" | "already" | "error">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const res = await fetch("/api/wallet/fund/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.credited) {
        setStatus("credited");
      } else if (res.ok && body.already) {
        setStatus("already");
      } else {
        setStatus("error");
        setMessage(body.error ?? "Could not confirm payment");
      }
      router.refresh();
    })();
  }, [sessionId, router]);

  const text =
    status === "credited"
      ? "Payment confirmed — funds added to your wallet."
      : status === "already"
        ? "Funds already added from this payment."
        : status === "error"
          ? message
          : "Confirming payment…";

  return (
    <div className="mt-4 border border-hairline bg-paper-raise p-5">
      <p className="text-sm text-ink-soft">{text}</p>
      {status === "error" && (
        <button
          type="button"
          className="btn-primary mt-3"
          onClick={() => router.refresh()}
        >
          Try again
        </button>
      )}
    </div>
  );
}
