"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { QuoteForm } from "@/src/components/QuoteForm";
import {
  getBookingDepositCents,
  getQuoteDistanceKm,
  getQuoteExpiresAtMs,
  getQuoteFromAddress,
  getQuoteItemsCount,
  getQuoteToAddress,
  getQuoteTotalCents,
} from "@/src/domain/viewAdapters";
import type { QuoteFormState } from "@/src/features/quotes/types";
import { useAppStore } from "@/src/state/AppStore";

const defaultQuoteFormValues: QuoteFormState = {
  fromAddress: "123 Main St",
  toAddress: "456 Oak Ave",
  moveDateISO: "2026-02-03",
  moveTime: "10:00",
  distanceKm: 12,
  itemsCount: 25,
  hasPacking: false,
  hasStorage: false,
};

function QuotePageFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          Loading quotes...
        </div>
      </main>
    </div>
  );
}

function QuotePageContent() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const promptedExpiredQuoteIdsRef = useRef<Set<string>>(new Set());

  const myQuotes = useMemo(() => {
    if (!activeUser) return [];
    return state.db.quotes.filter((q) => q.userId === activeUser.id);
  }, [activeUser, state.db.quotes]);

  const latestQuote = useMemo(() => myQuotes[0], [myQuotes]);

  const selectedQuote = useMemo(() => {
    const quoteIdFromQuery = searchParams.get("quoteId");
    const preferredQuoteId =
      quoteIdFromQuery && myQuotes.some((quote) => quote.id === quoteIdFromQuery)
        ? quoteIdFromQuery
        : selectedQuoteId;
    if (!preferredQuoteId) return latestQuote;
    return myQuotes.find((q) => q.id === preferredQuoteId) ?? latestQuote;
  }, [latestQuote, myQuotes, searchParams, selectedQuoteId]);

  const bookingForSelected = useMemo(() => {
    if (!selectedQuote) return undefined;
    return state.db.bookings.find((b) => b.quoteId === selectedQuote.id);
  }, [selectedQuote, state.db.bookings]);

  const paymentForSelected = useMemo(() => {
    if (!selectedQuote) return undefined;
    return state.db.payments.find((payment) => payment.quoteId === selectedQuote.id);
  }, [selectedQuote, state.db.payments]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      dispatch({ type: "quote/expireSweep", payload: { nowMs: now } });
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const timeRemainingMs = selectedQuote
    ? Math.max(0, getQuoteExpiresAtMs(selectedQuote) - nowMs)
    : 0;
  const timeRemainingLabel = selectedQuote
    ? `${Math.floor(timeRemainingMs / 60000)
        .toString()
        .padStart(2, "0")}:${Math.floor((timeRemainingMs % 60000) / 1000)
        .toString()
        .padStart(2, "0")}`
    : "00:00";

  const isQuoteInactive =
    !selectedQuote ||
    selectedQuote.status === "expired" ||
    selectedQuote.status === "declined" ||
    timeRemainingMs === 0;

  const canEditSelectedQuote =
    !!selectedQuote &&
    !paymentForSelected &&
    !bookingForSelected &&
    selectedQuote.status !== "declined" &&
    selectedQuote.status !== "expired" &&
    timeRemainingMs > 0;

  const selectedQuoteHasExpiredFeedback = useMemo(() => {
    if (!activeUser || !selectedQuote) return false;
    return state.db.feedback.some(
      (feedback) =>
        feedback.userId === activeUser.id &&
        feedback.quoteId === selectedQuote.id &&
        feedback.context === "expired_quote",
    );
  }, [activeUser, selectedQuote, state.db.feedback]);

  useEffect(() => {
    if (!activeUser || !selectedQuote) return;
    if (selectedQuote.status !== "expired") return;
    if (bookingForSelected || selectedQuoteHasExpiredFeedback) return;
    if (promptedExpiredQuoteIdsRef.current.has(selectedQuote.id)) return;

    promptedExpiredQuoteIdsRef.current.add(selectedQuote.id);
    const query = new URLSearchParams({
      context: "expired_quote",
      quoteId: selectedQuote.id,
      returnTo: "/quote",
    });
    router.push(`/feedback/quote-outcome?${query.toString()}`);
  }, [
    activeUser,
    bookingForSelected,
    router,
    selectedQuote,
    selectedQuoteHasExpiredFeedback,
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm underline" href="/">
            ← Home
          </Link>
          <button
            className="text-sm underline"
            onClick={() => dispatch({ type: "quote/expireSweep" })}
          >
            Run 24h expiry sweep (mock)
          </button>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Generate quote (UC-02)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Uses a simple mock pricing function. Requires being logged in.
          </p>
        </header>

        {!activeUser ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            You&apos;re not logged in. Go to{" "}
            <Link className="underline" href="/login">
              /login
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <QuoteForm
              key="create-quote-form"
              initialValues={defaultQuoteFormValues}
              heading="Quote form"
              submitLabel="Create quote"
              onSubmit={(values) => {
                dispatch({ type: "quote/create", payload: values });
                setSelectedQuoteId(null);
              }}
            />

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">My quotes</div>
                <div className="text-xs text-zinc-500">{myQuotes.length}</div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {myQuotes.length === 0 ? (
                  <li className="text-zinc-600 dark:text-zinc-400">No quotes yet.</li>
                ) : (
                  myQuotes.map((q) => (
                    <li
                      key={q.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{q.id}</span>
                        <span className="text-xs">{q.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Expires: {new Date(getQuoteExpiresAtMs(q)).toLocaleString()}
                      </div>
                      <div className="mt-2 font-semibold">
                        ${(getQuoteTotalCents(q) / 100).toFixed(2)}
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {getQuoteFromAddress(q)} → {getQuoteToAddress(q)} ({getQuoteDistanceKm(q)}
                        km, {getQuoteItemsCount(q)} items)
                      </div>
                      <button
                        className="mt-3 text-xs font-medium text-zinc-700 underline dark:text-zinc-200"
                        type="button"
                        onClick={() => {
                          setSelectedQuoteId(q.id);
                        }}
                      >
                        Use this quote for booking
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                Next: UC-03 will confirm a booking based on an active quote.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Accept quote & pay deposit (mock)</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Review the quote, make changes if needed, then continue to confirmation and
                    payment.
                  </p>
                </div>
                {selectedQuote ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-900">
                    Quote {selectedQuote.id}
                  </span>
                ) : null}
              </div>

              {searchParams.get("edited") === "1" && selectedQuote ? (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950 dark:text-sky-100">
                  You are reviewing your edited quote.
                </div>
              ) : null}

              {!selectedQuote ? (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  Generate a quote to see the deposit and booking flow.
                </div>
              ) : bookingForSelected ? (
                <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950">
                  <div className="font-semibold">Reservation confirmed</div>
                  <div>
                    Booking ID: <span className="font-mono">{bookingForSelected.id}</span>
                  </div>
                  <div>
                    Deposit paid: ${(getBookingDepositCents(bookingForSelected) / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-900/80 dark:text-emerald-100/70">
                    We&apos;ll hold your time slot and follow up with the operations manager.
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Quote total</span>
                      <span className="font-semibold">
                        ${(getQuoteTotalCents(selectedQuote) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      Confirm this quote to reserve your move. A refundable deposit is required.
                    </div>
                    {canEditSelectedQuote ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100">
                        Editing may change the final price and availability.
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>Mock 24h timer:</span>
                      {selectedQuote.status === "expired" || timeRemainingMs === 0 ? (
                        <span className="font-semibold text-red-600">Quote expired.</span>
                      ) : (
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {timeRemainingLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {canEditSelectedQuote ? (
                      <button
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                        type="button"
                        onClick={() => {
                          if (!selectedQuote) return;
                          router.push(`/quote/edit?quoteId=${selectedQuote.id}`);
                        }}
                      >
                        Edit quote
                      </button>
                    ) : null}
                    <button
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-700"
                      type="button"
                      disabled={isQuoteInactive}
                      onClick={() => {
                        if (!selectedQuote) return;
                        router.push(`/quote/payment?quoteId=${selectedQuote.id}`);
                      }}
                    >
                      Accept quote & continue
                    </button>
                    <button
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-200"
                      type="button"
                      disabled={isQuoteInactive}
                      onClick={() => {
                        if (!selectedQuote) return;
                        const query = new URLSearchParams({
                          context: "declined_quote",
                          quoteId: selectedQuote.id,
                          returnTo: "/quote",
                        });
                        dispatch({
                          type: "quote/reject",
                          payload: { quoteId: selectedQuote.id },
                        });
                        router.push(`/feedback/quote-outcome?${query.toString()}`);
                      }}
                    >
                      Reject quote
                    </button>
                  </div>
                  {!canEditSelectedQuote && selectedQuote.status !== "declined" ? (
                    <p className="text-xs text-zinc-500">
                      Quote editing is only available before payment and before the quote expires.
                    </p>
                  ) : null}
                  {selectedQuote.status === "declined" ? (
                    <p className="text-xs text-zinc-500">You declined this quote.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={<QuotePageFallback />}>
      <QuotePageContent />
    </Suspense>
  );
}
