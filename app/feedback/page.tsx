"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import type { Quote } from "@/src/mockDb/types";
import {
  getBookingDepositCents,
  getBookingPaidAtMs,
  getFeedbackMessage,
  getFeedbackSubmittedAtMs,
  getQuoteFromAddress,
  getQuoteMoveDateISO,
  getQuoteMoveTime,
  getQuoteToAddress,
  getQuoteTotalCents,
} from "@/src/domain/viewAdapters";

type PaidJob = {
  bookingId: string;
  bookingPaidAtMs: number;
  depositCents: number;
  quoteId: string;
  fromAddress: string;
  toAddress: string;
  moveDateISO: string;
  moveTime: string;
  totalCents: number;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatContextLabel(context: "post_service" | "declined_quote" | "expired_quote") {
  if (context === "post_service") return "Post-service";
  if (context === "declined_quote") return "Rejected quote";
  return "Expired quote";
}

export default function FeedbackPage() {
  const { state, dispatch } = useAppStore();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [message, setMessage] = useState("");
  const [preferredQuoteId, setPreferredQuoteId] = useState("");

  const myPaidJobs = useMemo<PaidJob[]>(() => {
    if (!activeUser) return [];
    return state.db.bookings
      .filter((booking) => booking.userId === activeUser.id)
      .map((booking) => {
        const quote = state.db.quotes.find((q) => q.id === booking.quoteId);
        if (!quote) return undefined;
        return {
          bookingId: booking.id,
          bookingPaidAtMs: getBookingPaidAtMs(booking),
          depositCents: getBookingDepositCents(booking),
          quoteId: quote.id,
          fromAddress: getQuoteFromAddress(quote),
          toAddress: getQuoteToAddress(quote),
          moveDateISO: getQuoteMoveDateISO(quote),
          moveTime: getQuoteMoveTime(quote),
          totalCents: getQuoteTotalCents(quote),
        };
      })
      .filter((job): job is PaidJob => Boolean(job))
      .sort((a, b) => b.bookingPaidAtMs - a.bookingPaidAtMs);
  }, [activeUser, state.db.bookings, state.db.quotes]);

  const myPostServiceFeedback = useMemo(() => {
    if (!activeUser) return [];
    return state.db.feedback.filter(
      (feedback) =>
        feedback.userId === activeUser.id && feedback.context === "post_service",
    );
  }, [activeUser, state.db.feedback]);

  const mySubmittedFeedback = useMemo(() => {
    if (!activeUser) return [];
    return state.db.feedback
      .filter((feedback) => feedback.userId === activeUser.id)
      .sort((a, b) => getFeedbackSubmittedAtMs(b) - getFeedbackSubmittedAtMs(a));
  }, [activeUser, state.db.feedback]);

  const ratedQuoteIds = useMemo(
    () =>
      new Set(
        myPostServiceFeedback
          .map((feedback) => feedback.quoteId)
          .filter((id): id is string => Boolean(id)),
      ),
    [myPostServiceFeedback],
  );

  const unratedPaidJobs = useMemo(
    () => myPaidJobs.filter((job) => !ratedQuoteIds.has(job.quoteId)),
    [myPaidJobs, ratedQuoteIds],
  );

  const selectedQuoteId = useMemo(() => {
    if (unratedPaidJobs.some((job) => job.quoteId === preferredQuoteId)) {
      return preferredQuoteId;
    }
    return unratedPaidJobs[0]?.quoteId ?? "";
  }, [preferredQuoteId, unratedPaidJobs]);

  const jobByQuoteId = useMemo(
    () => new Map(myPaidJobs.map((job) => [job.quoteId, job])),
    [myPaidJobs],
  );

  const myQuotesById = useMemo(() => {
    if (!activeUser) return new Map<string, Quote>();
    return new Map(
      state.db.quotes
        .filter((quote) => quote.userId === activeUser.id)
        .map((quote) => [quote.id, quote] as const),
    );
  }, [activeUser, state.db.quotes]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          {"<-"} Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Rate your service (UC-04)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Rate paid jobs and review all submitted quote feedback.
          </p>
        </header>

        {!activeUser ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            You are not logged in. Go to{" "}
            <Link className="underline" href="/login">
              /login
            </Link>{" "}
            to rate a completed move.
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <form
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedQuoteId || !message.trim()) return;
                  dispatch({
                    type: "feedback/add",
                    payload: {
                      context: "post_service",
                      quoteId: selectedQuoteId,
                      rating,
                      message: message.trim(),
                    },
                  });
                  setMessage("");
                }}
              >
                <div className="text-sm font-semibold">Post-service feedback</div>

                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Paid job
                  </div>
                  <select
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:disabled:bg-zinc-900"
                    value={selectedQuoteId}
                    onChange={(event) => setPreferredQuoteId(event.target.value)}
                    disabled={unratedPaidJobs.length === 0}
                  >
                    {unratedPaidJobs.length === 0 ? (
                      <option value="">No unrated paid jobs available</option>
                    ) : null}
                    {unratedPaidJobs.map((job) => (
                      <option key={job.quoteId} value={job.quoteId}>
                        {job.moveDateISO} {job.moveTime} | {job.fromAddress} to{" "}
                        {job.toAddress}
                      </option>
                    ))}
                  </select>
                </label>

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
                    placeholder="Share your experience with this move."
                  />
                </label>

                <button
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-700"
                  disabled={!selectedQuoteId || !message.trim()}
                >
                  Submit rating
                </button>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Logged in: {activeUser.email} ({activeUser.role})
                </p>
              </form>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Paid jobs</div>
                  <div className="text-xs text-zinc-500">{myPaidJobs.length}</div>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {myPaidJobs.length === 0 ? (
                    <li className="text-zinc-600 dark:text-zinc-400">
                      No paid jobs yet. Complete payment in{" "}
                      <Link className="underline" href="/quote">
                        /quote
                      </Link>{" "}
                      to see jobs here.
                    </li>
                  ) : (
                    myPaidJobs.map((job) => {
                      const hasRating = ratedQuoteIds.has(job.quoteId);
                      return (
                        <li
                          key={job.bookingId}
                          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {job.moveDateISO} {job.moveTime}
                            </span>
                            <span
                              className={`text-xs ${
                                hasRating ? "text-emerald-600" : "text-zinc-500"
                              }`}
                            >
                              {hasRating ? "Rated" : "Awaiting rating"}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {job.fromAddress} to {job.toAddress}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            Total: {formatMoney(job.totalCents)} | Deposit paid:{" "}
                            {formatMoney(job.depositCents)}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Paid on{" "}
                            {new Date(job.bookingPaidAtMs).toLocaleString()} | Quote{" "}
                            <span className="font-mono">{job.quoteId}</span>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">My submitted feedback</div>
                <div className="text-xs text-zinc-500">
                  {mySubmittedFeedback.length}
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {mySubmittedFeedback.length === 0 ? (
                  <li className="text-zinc-600 dark:text-zinc-400">
                    No feedback submitted yet.
                  </li>
                ) : (
                  mySubmittedFeedback.map((feedback) => {
                    const paidJob = feedback.quoteId
                      ? jobByQuoteId.get(feedback.quoteId)
                      : undefined;
                    const quote = feedback.quoteId
                      ? myQuotesById.get(feedback.quoteId)
                      : undefined;
                    return (
                      <li
                        key={feedback.id}
                        className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">
                            {formatContextLabel(feedback.context)}
                          </span>
                          <span className="text-xs">
                            {feedback.rating ? `${feedback.rating}/5` : "-"}
                          </span>
                        </div>
                        {paidJob ? (
                          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {paidJob.moveDateISO} {paidJob.moveTime} |{" "}
                            {paidJob.fromAddress} to {paidJob.toAddress}
                          </div>
                        ) : quote ? (
                          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {getQuoteMoveDateISO(quote)} {getQuoteMoveTime(quote)} |{" "}
                            {getQuoteFromAddress(quote)} to {getQuoteToAddress(quote)}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(getFeedbackSubmittedAtMs(feedback)).toLocaleString()}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap">
                          {getFeedbackMessage(feedback)}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
