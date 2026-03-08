"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import { getBookingDepositCents, getQuoteTotalCents } from "@/src/domain/viewAdapters";

export default function BookingPage() {
  const { state, dispatch } = useAppStore();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const myQuotes = useMemo(() => {
    if (!activeUser) return [];
    return state.db.quotes.filter((q) => q.userId === activeUser.id);
  }, [activeUser, state.db.quotes]);

  const activeQuotes = myQuotes.filter(
    (q) => q.status === "active" || q.status === "accepted",
  );

  const [quoteId, setQuoteId] = useState<string>(activeQuotes[0]?.id ?? "");
  const [depositCents, setDepositCents] = useState<number>(5000); // $50 mock deposit

  const myBookings = useMemo(() => {
    if (!activeUser) return [];
    return state.db.bookings.filter((b) => b.userId === activeUser.id);
  }, [activeUser, state.db.bookings]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          ← Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Confirm booking + deposit (UC-03)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Fully mocked: selecting an active quote and “paying” creates a
            confirmed booking record.
          </p>
        </header>

        {!activeUser ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            You’re not logged in. Go to{" "}
            <Link className="underline" href="/login">
              /login
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={(e) => {
                e.preventDefault();
                if (!quoteId) return;
                dispatch({
                  type: "booking/confirm",
                  payload: { quoteId, depositCents },
                });
              }}
            >
              <div className="text-sm font-semibold">Confirm booking</div>

              <label className="block space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Quote
                </div>
                <select
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={quoteId}
                  onChange={(e) => setQuoteId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a quote
                  </option>
                  {activeQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.id} (${(getQuoteTotalCents(q) / 100).toFixed(2)}) [{q.status}]
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Deposit ($)
                </div>
                <input
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={depositCents / 100}
                  type="number"
                  min={0}
                  step={1}
                  onChange={(e) =>
                    setDepositCents(Math.round(Number(e.target.value) * 100))
                  }
                />
              </label>

              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                Pay deposit & confirm (mock)
              </button>

              {activeQuotes.length === 0 ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  No active quotes. Create one at{" "}
                  <Link className="underline" href="/quote">
                    /quote
                  </Link>
                  .
                </p>
              ) : null}
            </form>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">My bookings</div>
                <div className="text-xs text-zinc-500">{myBookings.length}</div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {myBookings.length === 0 ? (
                  <li className="text-zinc-600 dark:text-zinc-400">
                    No bookings yet.
                  </li>
                ) : (
                  myBookings.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{b.id}</span>
                        <span className="text-xs">{b.status}</span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        Quote: {b.quoteId}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Deposit: ${(getBookingDepositCents(b) / 100).toFixed(2)}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
