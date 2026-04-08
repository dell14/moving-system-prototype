import { NextResponse } from "next/server";
import { getStripeServerClient } from "@/src/lib/stripe";

type CreateCheckoutSessionBody = {
  quoteId?: string;
  depositCents?: number;
};

function normalizeDepositCents(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionBody;
    const quoteId = body.quoteId?.trim();
    const depositCents = normalizeDepositCents(body.depositCents);

    if (!quoteId || depositCents <= 0) {
      return NextResponse.json(
        { error: "A valid quote ID and deposit amount are required." },
        { status: 400 },
      );
    }

    const stripe = getStripeServerClient();
    const origin = new URL(request.url).origin;

    // We keep the prototype's booking data mocked. Stripe only handles the hosted test payment.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: quoteId,
      success_url: `${origin}/quote/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/quote/payment?quoteId=${encodeURIComponent(quoteId)}&canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: depositCents,
            product_data: {
              name: "Moving deposit",
              description: `Prototype deposit for quote ${quoteId}`,
            },
          },
        },
      ],
      metadata: {
        quoteId,
        depositCents: String(depositCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create Stripe Checkout session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing Stripe Checkout session ID." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const depositCents = normalizeDepositCents(session.metadata?.depositCents);

    return NextResponse.json({
      sessionId: session.id,
      paid: session.payment_status === "paid",
      quoteId: session.metadata?.quoteId ?? session.client_reference_id ?? "",
      depositCents,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify Stripe Checkout session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
