import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fundWallet, logger } from "@estatex/core";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    logger.warn({ err }, "invalid stripe webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amount = session.amount_total;
    if (userId && amount) {
      await fundWallet(userId, amount, {
        referenceId: session.id,
        note: "Stripe test checkout top-up"
      });
      logger.info({ userId, amount }, "wallet funded via stripe webhook");
    }
  }

  return NextResponse.json({ received: true });
}
