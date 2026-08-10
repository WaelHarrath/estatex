import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getCurrentUser } from "@/src/guards";
import { fundWallet, getWalletBalance, prisma, logger } from "@estatex/core";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  sessionId: z.string().trim().min(1).regex(/^cs_/)
});

/**
 * Confirm-on-redirect: after Stripe checkout the user lands on
 * /wallet?funded=1&session_id=cs_... This endpoint retrieves the paid
 * session from Stripe and credits the wallet. Idempotent via the FUND
 * transaction's referenceId, so a page refresh (or a concurrent webhook)
 * never double-credits.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }
  const sessionId = parsed.data.sessionId;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe test mode is not configured" }, { status: 501 });
  }

  const stripe = new Stripe(key);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    logger.warn({ sessionId, err }, "could not retrieve stripe checkout session");
    return NextResponse.json({ error: "Payment session not found" }, { status: 404 });
  }

  if (session.metadata?.userId !== user.id) {
    return NextResponse.json({ error: "Payment session does not belong to this user" }, { status: 403 });
  }
  if (session.payment_status !== "paid" || !session.amount_total) {
    return NextResponse.json({ error: "Payment is not completed" }, { status: 400 });
  }

  // Idempotency: already credited (refresh or concurrent webhook)?
  const existing = await prisma.walletTransaction.findFirst({
    where: { referenceId: sessionId, type: "FUND" }
  });
  const balance = await getWalletBalance(user.id);
  if (existing) {
    return NextResponse.json({ credited: false, already: true, balance });
  }

  try {
    await fundWallet(user.id, session.amount_total, {
      referenceId: sessionId,
      note: "Stripe test checkout top-up"
    });
  } catch (err) {
    logger.error({ sessionId, err }, "failed to credit wallet from stripe checkout");
    return NextResponse.json({ error: "Could not credit wallet" }, { status: 500 });
  }

  const credited = await getWalletBalance(user.id);
  logger.info({ userId: user.id, sessionId, amount: session.amount_total }, "wallet funded via checkout confirm");
  return NextResponse.json({ credited: true, balance: credited });
}
