"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

type OutcomeContext = "declined_quote" | "expired_quote";

function contextLabel(context: OutcomeContext) {
  return context === "declined_quote" ? "Quote rejected" : "Quote expired";
}

function contextDescription(context: OutcomeContext) {
  return context === "declined_quote"
    ? "Tell us why you rejected this quote."
    : "Tell us why you did not book before this quote expired.";
}

export default function QuoteOutcomeFeedbackPage() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [message, setMessage] = useState("");

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const quoteId = searchParams.get("quoteId");
  const rawContext = searchParams.get("context");
  const context: OutcomeContext | null =
    rawContext === "declined_quote" || rawContext === "expired_quote"
      ? rawContext
      : null;

  const rawReturnTo = searchParams.get("returnTo") ?? "/quote";
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/quote";

  const quote = useMemo(() => {
    if (!activeUser || !quoteId) return undefined;
    return state.db.quotes.find((q) => q.id === quoteId && q.userId === activeUser.id);
  }, [activeUser, quoteId, state.db.quotes]);

  const alreadySubmitted = useMemo(() => {
    if (!activeUser || !quoteId || !context) return false;
    return state.db.feedback.some(
      (feedback) =>
        feedback.userId === activeUser.id &&
        feedback.quoteId === quoteId &&
        feedback.context === context,
    );
  }, [activeUser, context, quoteId, state.db.feedback]);

  const contextMismatch = useMemo(() => {
    if (!context || !quote) return false;
    if (context === "declined_quote") return quote.status !== "declined";
    return quote.status !== "expired";
  }, [context, quote]);

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/login">
            {"<-"} Go to login
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            You are not logged in.
          </div>
        </main>
      </div>
    );
  }

  if (!quoteId || !context || !quote) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/quote">
            {"<-"} Back to quote
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            We could not find that quote feedback request.
          </div>
        </main>
      </div>
    );
  }

  if (contextMismatch) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href={returnTo}>
            {"<-"} Back
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            This quote is not in the expected state for this feedback form.
          </div>
        </main>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/feedback">
            {"<-"} Rate your service
          </Link>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950">
            Feedback for this quote has already been submitted.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm underline" href={returnTo}>
            {"<-"} Back
          </Link>
          <Link className="text-sm underline" href="/feedback">
            Rate your service
          </Link>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{contextLabel(context)}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {contextDescription(context)}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            onSubmit={(event) => {
              event.preventDefault();
              if (!message.trim()) return;
              dispatch({
                type: "feedback/add",
                payload: {
                  context,
                  quoteId: quote.id,
                  rating,
                  message: message.trim(),
                },
              });
              router.push("/feedback");
            }}
          >
            <div className="text-sm font-semibold">Quote outcome feedback</div>

            <label className="block space-y-1">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Rating
              </div>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={rating}
                onChange={(event) =>
                  setRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
                }
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Okay</option>
                <option value={2}>2 - Bad</option>
                <option value={1}>1 - Terrible</option>
              </select>
            </label>

            <label className="block space-y-1">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Message
              </div>
              <textarea
                className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share details that can help improve future quotes."
              />
            </label>

            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-700"
              disabled={!message.trim()}
            >
              Submit feedback
            </button>
          </form>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">Quote details</div>
            <div className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                Quote ID: <span className="font-mono">{quote.id}</span>
              </div>
              <div>Status: {quote.status}</div>
              <div>
                Move: {quote.input.moveDateISO} at {quote.input.moveTime}
              </div>
              <div>
                Route: {quote.input.fromAddress} to {quote.input.toAddress}
              </div>
              <div>Items: {quote.input.itemsCount}</div>
              <div>Total: ${(quote.totalCents / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
