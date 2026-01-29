"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function FeedbackPage() {
  const { state, dispatch } = useAppStore();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const [context, setContext] = useState<
    "post_service" | "declined_quote" | "expired_quote"
  >("post_service");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [message, setMessage] = useState("");

  const myFeedback = useMemo(() => {
    if (!activeUser) return state.db.feedback;
    return state.db.feedback.filter((f) => f.userId === activeUser.id);
  }, [activeUser, state.db.feedback]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          ← Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Send feedback (UC-04)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mocked feedback storage. Can be tied to a user when logged in.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            onSubmit={(e) => {
              e.preventDefault();
              if (!message.trim()) return;
              dispatch({
                type: "feedback/add",
                payload: { context, rating, message: message.trim() },
              });
              setMessage("");
            }}
          >
            <div className="text-sm font-semibold">Feedback form</div>

            <label className="block space-y-1">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Context
              </div>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={context}
                onChange={(e) => setContext(e.target.value as typeof context)}
              >
                <option value="post_service">Post-service</option>
                <option value="declined_quote">Declined quote</option>
                <option value="expired_quote">Expired quote</option>
              </select>
            </label>

            <label className="block space-y-1">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Rating
              </div>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={rating}
                onChange={(e) =>
                  setRating(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
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
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
              Submit feedback
            </button>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Logged in:{" "}
              {activeUser ? `${activeUser.email} (${activeUser.role})` : "no"}
            </p>
          </form>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {activeUser ? "My feedback" : "All feedback (anon view)"}
              </div>
              <div className="text-xs text-zinc-500">{myFeedback.length}</div>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {myFeedback.length === 0 ? (
                <li className="text-zinc-600 dark:text-zinc-400">
                  No feedback yet.
                </li>
              ) : (
                myFeedback.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{f.context}</span>
                      <span className="text-xs">
                        {f.rating ? `${f.rating}/5` : "—"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {new Date(f.createdAtMs).toLocaleString()}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap">{f.message}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
