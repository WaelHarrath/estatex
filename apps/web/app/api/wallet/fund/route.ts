import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getCurrentUser } from "@/src/guards";

export const dynamic = "force-dynamic";

const fundSchema = z.object({
  amountCents: z.number().int().positive().max(10_000_000_00 / 100)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe test mode is not configured" }, { status: 501 });
  }

  const stripe = new Stripe(key);
  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "EstateX wallet top-up (demo)" },
          unit_amount: parsed.data.amountCents
        },
        quantity: 1
      }
    ],
    metadata: { userId: user.id },
    success_url: `${origin}/wallet?funded=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/wallet?cancelled=1`
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
