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
import { useUnsavedChangesWarning } from "@/src/hooks/useUnsavedChangesWarning";

type PaymentErrors = {
  form?: string;
  amount?: string;
  name?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  zip?: string;
};

const FIXED_DEPOSIT_DOLLARS = 100;
const FIXED_DEPOSIT_CENTS = FIXED_DEPOSIT_DOLLARS * 100;

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
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [submitAttemptCount, setSubmitAttemptCount] = useState(0);

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
  const hasUnsavedChanges =
    !booking &&
    [name, cardNumber, expiry, cvc, zip].some((value) => value.trim().length > 0);
  const submitError =
    submitAttemptCount > 0 && !booking
      ? "We couldn't confirm your deposit. Please review the form and try again."
      : undefined;

  useUnsavedChangesWarning({
    isEnabled: hasUnsavedChanges,
    message: "Are you sure you want to leave? Your payment form details will be lost.",
  });

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
            ← Back to quote
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            We couldn’t find that quote. Please generate a new one.
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
            ← Back to quote
          </Link>
          <div className="text-xs text-zinc-500">Secure checkout</div>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Payment</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This is a simulated checkout to reserve your move. No real charges
            are processed.
          </p>
        </header>

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
                  We’ll email your confirmation shortly.
                </p>
              </div>
            ) : (
              <form
                className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!activeUser) {
                    setErrors({ form: "Please log in to complete payment." });
                    return;
                  }
                  if (!quote || quote.userId !== activeUser.id) {
                    setErrors({
                      form: "We couldn't find that quote for your account.",
                    });
                    return;
                  }
                  if (isExpired) {
                    setErrors({ amount: "This quote has expired." });
                    return;
                  }
                  if (isDeclined) {
                    setErrors({ amount: "This quote was declined." });
                    return;
                  }
                  const nextErrors: PaymentErrors = {};
                  const normalizedCard = cardNumber.replace(/\s+/g, "");
                  if (!name.trim()) nextErrors.name = "Enter the cardholder name.";
                  if (!/^\d{16}$/.test(normalizedCard))
                    nextErrors.cardNumber = "Enter a 16-digit card number.";
                  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))
                    nextErrors.expiry = "Use MM/YY format.";
                  if (!/^\d{3,4}$/.test(cvc))
                    nextErrors.cvc = "Enter a 3 or 4 digit CVC.";
                  if (!zip.trim())
                    nextErrors.zip = "Enter the billing ZIP or postal code.";
                  if (Object.keys(nextErrors).length > 0) {
                    setErrors(nextErrors);
                    return;
                  }
                  setErrors({});
                  setSubmitAttemptCount((count) => count + 1);
                  dispatch({
                    type: "booking/confirm",
                    payload: {
                      quoteId: quote.id,
                      depositCents: FIXED_DEPOSIT_CENTS,
                    },
                  });
                }}
              >
                <div>
                  <div className="text-xs font-semibold">Payment details</div>
                  <p className="text-xs text-zinc-500">
                    All fields are required for this checkout.
                  </p>
                </div>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Deposit amount</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={`$${FIXED_DEPOSIT_DOLLARS.toFixed(2)}`}
                    readOnly
                  />
                  {errors.amount ? (
                    <p className="text-xs text-red-600">{errors.amount}</p>
                  ) : null}
                </label>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Cardholder name</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Jordan Lee"
                  />
                  {errors.name ? (
                    <p className="text-xs text-red-600">{errors.name}</p>
                  ) : null}
                </label>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Card number</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                    placeholder="4242 4242 4242 4242"
                  />
                  {errors.cardNumber ? (
                    <p className="text-xs text-red-600">{errors.cardNumber}</p>
                  ) : null}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <div className="text-xs text-zinc-500">Expiry</div>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      value={expiry}
                      onChange={(event) => setExpiry(event.target.value)}
                      placeholder="MM/YY"
                    />
                    {errors.expiry ? (
                      <p className="text-xs text-red-600">{errors.expiry}</p>
                    ) : null}
                  </label>

                  <label className="block space-y-1">
                    <div className="text-xs text-zinc-500">CVC</div>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      value={cvc}
                      onChange={(event) => setCvc(event.target.value)}
                      placeholder="123"
                    />
                    {errors.cvc ? (
                      <p className="text-xs text-red-600">{errors.cvc}</p>
                    ) : null}
                  </label>
                </div>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Billing ZIP / postal code</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    placeholder="94107 or H2X 1Y4"
                  />
                  {errors.zip ? (
                    <p className="text-xs text-red-600">{errors.zip}</p>
                  ) : null}
                </label>

                {errors.form ? (
                  <p className="text-xs text-red-600">{errors.form}</p>
                ) : submitError ? (
                  <p className="text-xs text-red-600">{submitError}</p>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-700"
                  disabled={isExpired || isDeclined}
                >
                  Pay deposit & reserve
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
            <div className="text-xs text-zinc-500">
              {getQuoteFromAddress(quote)} → {getQuoteToAddress(quote)}
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

