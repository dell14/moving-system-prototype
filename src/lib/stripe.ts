import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add your Stripe test secret key to .env.local.",
    );
  }

  if (!stripeClient) {
    // This app only uses Stripe Checkout in test mode, so the secret key stays server-side.
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
