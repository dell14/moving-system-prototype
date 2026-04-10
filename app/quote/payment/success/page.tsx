"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/src/state/AppStore";
import { getBookingDepositCents } from "@/src/domain/viewAdapters";

type CheckoutVerification = {
  sessionId: string;
  paid: boolean;
  quoteId: string;
  depositCents: number;
};

function QuotePaymentSuccessFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          Validating Stripe test payment...
        </div>
      </main>
    </div>
  );
}

function QuotePaymentSuccessContent() {
  const { state, dispatch } = useAppStore();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const hasDispatchedConfirmationRef = useRef(false);
  const [verification, setVerification] = useState<CheckoutVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing Stripe Checkout session ID.");
      return;
    }

    const verifiedSessionId = sessionId;
    let isCancelled = false;

    async function verifySession() {
      try {
        const response = await fetch(
          `/api/stripe/checkout-session?session_id=${encodeURIComponent(verifiedSessionId)}`,
        );
        const data = (await response.json()) as CheckoutVerification & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to verify Stripe test payment.");
        }

        if (!isCancelled) {
          setVerification(data);
        }
      } catch (nextError) {
        if (!isCancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to verify Stripe test payment.",
          );
        }
      }
    }

    void verifySession();

    return () => {
      isCancelled = true;
    };
  }, [sessionId]);

  const booking = useMemo(() => {
    if (!verification?.quoteId) return undefined;
    return state.db.bookings.find((record) => record.quoteId === verification.quoteId);
  }, [state.db.bookings, verification?.quoteId]);

  useEffect(() => {
    if (!verification?.paid || !verification.quoteId || verification.depositCents <= 0) return;
    if (booking || hasDispatchedConfirmationRef.current) return;

    // Stripe confirms the test charge first; then we reuse the existing mock booking reducer.
    hasDispatchedConfirmationRef.current = true;
    dispatch({
      type: "booking/confirm",
      payload: {
        quoteId: verification.quoteId,
        depositCents: verification.depositCents,
      },
    });
  }, [booking, dispatch, verification]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm underline" href="/quote">
            {"<-"} Back to quote
          </Link>
          <div className="text-xs text-zinc-500">Stripe test mode</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          {!verification && !error ? (
            <>
              <div className="font-semibold">Validating payment</div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Confirming your Stripe test checkout session...
              </p>
            </>
          ) : error ? (
            <>
              <div className="font-semibold text-red-600">Unable to confirm test payment</div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{error}</p>
            </>
          ) : !verification?.paid ? (
            <>
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                Payment not completed
              </div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Stripe did not mark this test session as paid.
              </p>
            </>
          ) : booking ? (
            <>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                Test payment successful
              </div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Your Stripe test payment was confirmed and the existing mock booking flow has been
                completed.
              </p>
              <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950">
                <div>
                  Booking ID: <span className="font-mono">{booking.id}</span>
                </div>
                <div>Quote ID: <span className="font-mono">{booking.quoteId}</span></div>
                <div>
                  Deposit paid: ${(getBookingDepositCents(booking) / 100).toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                Test payment successful
              </div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Stripe confirmed the test payment. Finalizing the existing mock booking flow...
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function QuotePaymentSuccessPage() {
  return (
    <Suspense fallback={<QuotePaymentSuccessFallback />}>
      <QuotePaymentSuccessContent />
    </Suspense>
  );
}
