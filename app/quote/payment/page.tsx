"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import {
  getBookingDepositCents,
  getQuoteExpiresAtMs,
  getQuoteFromAddress,
  getQuoteToAddress,
  getQuoteTotalCents,
} from "@/src/domain/viewAdapters";

const FIXED_DEPOSIT_DOLLARS = 100;
const FIXED_DEPOSIT_CENTS = FIXED_DEPOSIT_DOLLARS * 100;

type CheckoutSessionResponse = {
  url?: string;
  error?: string;
};

function QuotePaymentPageFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          Loading payment details...
        </div>
      </main>
    </div>
  );
}

function QuotePaymentPageContent() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const promptedOutcomeKeyRef = useRef<string | null>(null);
  const bookingConfirmedRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const quote = useMemo(() => {
    if (!quoteId || !activeUser) return undefined;
    return state.db.quotes.find((q) => q.id === quoteId && q.userId === activeUser.id);
  }, [activeUser, quoteId, state.db.quotes]);
  const quoteRecordId = quote?.id;

  const booking = useMemo(() => {
    if (!quote) return undefined;
    return state.db.bookings.find((b) => b.quoteId === quote.id);
  }, [quote, state.db.bookings]);

  const pausedQuoteTimer =
    quote && state.pausedQuoteTimer?.quoteId === quote.id
      ? state.pausedQuoteTimer
      : null;
  const effectiveNowMs = pausedQuoteTimer?.startedAtMs ?? nowMs;
  const isExpired = quote ? getQuoteExpiresAtMs(quote) <= effectiveNowMs : false;
  const isDeclined = quote?.status === "declined";
  const wasCanceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    bookingConfirmedRef.current = Boolean(booking);
  }, [booking]);

  useEffect(() => {
    if (!quoteRecordId || bookingConfirmedRef.current) return undefined;

    dispatch({
      type: "quote/pauseTimer",
      payload: { quoteId: quoteRecordId, startedAtMs: Date.now() },
    });

    return () => {
      if (bookingConfirmedRef.current) {
        dispatch({ type: "quote/clearTimerPause", payload: { quoteId: quoteRecordId } });
        return;
      }

      dispatch({
        type: "quote/resumeTimer",
        payload: { quoteId: quoteRecordId, resumedAtMs: Date.now() },
      });
    };
  }, [dispatch, quoteRecordId]);

  useEffect(() => {
    if (!booking || !quoteRecordId) return;
    dispatch({ type: "quote/clearTimerPause", payload: { quoteId: quoteRecordId } });
  }, [booking, dispatch, quoteRecordId]);

  useEffect(() => {
    if (!activeUser || !quote || !quoteId || booking) return;

    const context =
      isDeclined ? "declined_quote" : isExpired ? "expired_quote" : null;
    if (!context) return;

    const alreadySubmitted = state.db.feedback.some(
      (feedback) =>
        feedback.userId === activeUser.id &&
        feedback.quoteId === quote.id &&
        feedback.context === context,
    );
    if (alreadySubmitted) return;

    const promptKey = `${context}:${quote.id}`;
    if (promptedOutcomeKeyRef.current === promptKey) return;
    promptedOutcomeKeyRef.current = promptKey;

    const query = new URLSearchParams({
      context,
      quoteId,
      returnTo: `/quote/payment?quoteId=${quoteId}`,
    });
    router.push(`/feedback/quote-outcome?${query.toString()}`);
  }, [
    activeUser,
    booking,
    isDeclined,
    isExpired,
    quote,
    quoteId,
    router,
    state.db.feedback,
  ]);

  async function handleCheckoutRedirect() {
    if (!activeUser) {
      setRedirectError("Please log in to complete payment.");
      return;
    }

    if (!quote || quote.userId !== activeUser.id) {
      setRedirectError("We couldn't find that quote for your account.");
      return;
    }

    if (isExpired) {
      setRedirectError("This quote has expired.");
      return;
    }

    if (isDeclined) {
      setRedirectError("This quote was declined.");
      return;
    }

    setRedirectError(null);
    setIsRedirecting(true);

    try {
      // Stripe session creation stays on the server so the secret key never reaches the browser.
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: quote.id,
          depositCents: FIXED_DEPOSIT_CENTS,
        }),
      });

      const data = (await response.json()) as CheckoutSessionResponse;

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start Stripe Checkout.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setRedirectError(
        error instanceof Error ? error.message : "Unable to start Stripe Checkout.",
      );
      setIsRedirecting(false);
    }
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/login">
            {"<-"} Go to login
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            Please log in to complete payment.
          </div>
        </main>
      </div>
    );
  }

  if (!quoteId || !quote) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/quote">
            {"<-"} Back to quote
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            We couldn&apos;t find that quote. Please generate a new one.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm underline" href="/quote">
            {"<-"} Back to quote
          </Link>
          <div className="text-xs text-zinc-500">Secure checkout</div>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Payment</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Continue to Stripe&apos;s hosted test checkout to reserve your move.
          </p>
        </header>

        {wasCanceled && !booking ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100">
            Your Stripe test payment was canceled. You can review the quote and try again.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            {booking ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950">
                <div className="font-semibold">Payment complete</div>
                <div className="mt-2">
                  Booking ID: <span className="font-mono">{booking.id}</span>
                </div>
                <div>
                  Deposit paid: ${(getBookingDepositCents(booking) / 100).toFixed(2)}
                </div>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/70">
                  We&apos;ll email your confirmation shortly.
                </p>
              </div>
            ) : (
              <form
                className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCheckoutRedirect();
                }}
              >
                <div>
                  <div className="text-xs font-semibold">Payment details</div>
                  <p className="text-xs text-zinc-500">
                    Stripe collects the test card details on the next screen.
                  </p>
                </div>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Deposit amount</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={`$${FIXED_DEPOSIT_DOLLARS.toFixed(2)}`}
                    readOnly
                  />
                </label>

                <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-xs text-zinc-500 dark:border-zinc-800">
                  This prototype still keeps all booking records mocked locally. A successful
                  Stripe test payment will return here and then finalize the existing mock booking
                  flow.
                </div>

                {redirectError ? (
                  <p className="text-xs text-red-600">{redirectError}</p>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-700"
                  disabled={isExpired || isDeclined || isRedirecting}
                >
                  {isRedirecting ? "Redirecting to Stripe..." : "Pay deposit & reserve"}
                </button>
              </form>
            )}
          </section>

          <aside className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-semibold">Order summary</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Quote ID</span>
              <span className="font-mono text-xs">{quote.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total</span>
              <span className="font-semibold">
                ${(getQuoteTotalCents(quote) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Deposit</span>
              <span className="font-semibold">${FIXED_DEPOSIT_DOLLARS.toFixed(2)}</span>
            </div>
            <div className="text-xs text-zinc-500">
              {getQuoteFromAddress(quote)} {"->"} {getQuoteToAddress(quote)}
            </div>
            <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700">
              {isDeclined ? (
                <span className="text-red-600">Quote declined.</span>
              ) : isExpired ? (
                <span className="text-red-600">Quote expired.</span>
              ) : pausedQuoteTimer ? (
                "Quote timer paused while you complete payment."
              ) : (
                "Timer is running."
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function QuotePaymentPage() {
  return (
    <Suspense fallback={<QuotePaymentPageFallback />}>
      <QuotePaymentPageContent />
    </Suspense>
  );
}
