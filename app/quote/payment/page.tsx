"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import {
  getBookingDepositCents,
  getQuoteExpiresAtMs,
  getQuoteFromAddress,
  getQuoteToAddress,
  getQuoteTotalCents,
} from "@/src/domain/viewAdapters";

type PaymentErrors = {
  amount?: string;
  name?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  zip?: string;
};

export default function QuotePaymentPage() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const promptedOutcomeKeyRef = useRef<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [amount, setAmount] = useState("150");
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [errors, setErrors] = useState<PaymentErrors>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      dispatch({ type: "quote/expireSweep", payload: { nowMs: now } });
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const quote = useMemo(() => {
    if (!quoteId) return undefined;
    return state.db.quotes.find((q) => q.id === quoteId);
  }, [quoteId, state.db.quotes]);

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const booking = useMemo(() => {
    if (!quote) return undefined;
    return state.db.bookings.find((b) => b.quoteId === quote.id);
  }, [quote, state.db.bookings]);

  const isExpired = quote ? getQuoteExpiresAtMs(quote) <= nowMs : false;
  const isDeclined = quote?.status === "declined";

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
          <div className="text-xs text-zinc-500">Secure checkout (mock)</div>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Mock payment</h1>
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
                  if (!amount || Number(amount) <= 0)
                    nextErrors.amount = "Enter a valid deposit amount.";
                  if (!name.trim()) nextErrors.name = "Enter the cardholder name.";
                  if (!/^\d{16}$/.test(normalizedCard))
                    nextErrors.cardNumber = "Enter a 16-digit card number.";
                  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))
                    nextErrors.expiry = "Use MM/YY format.";
                  if (!/^\d{3,4}$/.test(cvc))
                    nextErrors.cvc = "Enter a 3 or 4 digit CVC.";
                  if (!/^\d{5}$/.test(zip))
                    nextErrors.zip = "Enter a 5 digit ZIP code.";
                  if (Object.keys(nextErrors).length > 0) {
                    setErrors(nextErrors);
                    return;
                  }
                  setErrors({});
                  dispatch({
                    type: "booking/confirm",
                    payload: {
                      quoteId: quote.id,
                      depositCents: Math.round(Number(amount) * 100),
                    },
                  });
                }}
              >
                <div>
                  <div className="text-xs font-semibold">Payment details</div>
                  <p className="text-xs text-zinc-500">
                    All fields are required for this mock checkout.
                  </p>
                </div>

                <label className="block space-y-1">
                  <div className="text-xs text-zinc-500">Deposit amount</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
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
                  <div className="text-xs text-zinc-500">Billing ZIP</div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    placeholder="94107"
                  />
                  {errors.zip ? (
                    <p className="text-xs text-red-600">{errors.zip}</p>
                  ) : null}
                </label>

                <button
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
              ) : (
                "Timer is running (mock 24h → 3 min)."
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

