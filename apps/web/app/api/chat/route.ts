import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/guards";
import { runConcierge } from "@/src/ai/concierge";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  propertyId: z.string().trim().min(1).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const sessionId = request.headers.get("x-session-id") || "default";
  const reply = await runConcierge(user.id, sessionId, parsed.data.message, parsed.data.propertyId);

  return NextResponse.json({ reply });
}
