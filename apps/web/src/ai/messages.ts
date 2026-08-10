import { prisma } from "@estatex/core";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/** Load the last N persisted turns of a concierge session, oldest first. */
export async function loadHistory(
  userId: string,
  sessionId: string,
  take = 20
): Promise<HistoryMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { userId, sessionId },
    orderBy: { createdAt: "asc" },
    take
  });
  return rows.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content
  }));
}

/** Persist the user message and the assistant reply for this turn. */
export async function persistTurn(
  userId: string,
  sessionId: string,
  message: string,
  reply: string
): Promise<void> {
  await prisma.chatMessage.createMany({
    data: [
      { userId, sessionId, role: "user", content: message },
      { userId, sessionId, role: "assistant", content: reply }
    ]
  });
}
