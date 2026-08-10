"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({ propertyId }: { propertyId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(`session-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (propertyId) {
      setMessages([
        {
          role: "assistant",
          content: "Hi — I'm your EstateX concierge. Ask me about this property, the auction, or buying shares."
        }
      ]);
    }
  }, [propertyId]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionRef.current },
        body: JSON.stringify({ message: text, propertyId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Chat request failed");
      }
      const body = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: "assistant", content: body.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col  border border-hairline">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft">
            Ask anything — pricing, comparables, auction rules, or how shares work.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%]  px-4 py-2 text-sm ${m.role === "user" ? "ml-auto bg-gold text-abyss" : "bg-paper-deep text-ink"}`}>
            {m.content}
          </div>
        ))}
        {busy && <p className="text-sm text-ink-soft">Thinking…</p>}
        {error && <p className="text-sm text-stamp">{error}</p>}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-hairline p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the concierge…"
          disabled={busy}
          className="flex-1  border border-hairline px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="btn-primary disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
