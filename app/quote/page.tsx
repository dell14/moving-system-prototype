"use client";

import Link from "next/link";

import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function QuotePage() {
  const { state, dispatch } = useAppStore();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const [fromAddress, setFromAddress] = useState("123 Main St");
  const [toAddress, setToAddress] = useState("456 Oak Ave");
  // Keep this deterministic for lint purity rules (no Date.now() during render).
  const [moveDateISO, setMoveDateISO] = useState("2026-02-03");
  const [moveTime, setMoveTime] = useState("10:00");
  const [distanceKm, setDistanceKm] = useState(12);
  const [itemsCount, setItemsCount] = useState(25);
  const [hasPacking, setHasPacking] = useState(false);
  const [hasStorage, setHasStorage] = useState(false);

  const myQuotes = useMemo(() => {
    if (!activeUser) return [];
    return state.db.quotes.filter((q) => q.userId === activeUser.id);
  }, [activeUser, state.db.quotes]);

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
                dispatch({
                  type: "quote/create",
                  payload: {
                    fromAddress,
                    toAddress,
                    moveDateISO,
                    moveTime,
                    distanceKm,
                    itemsCount,
                    hasPacking,
                    hasStorage,
                  },
                });
              }}
            >
              <div className="text-sm font-semibold">Quote form</div>

              <label className="block space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  From address
                </div>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  To address
                </div>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Move date
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={moveDateISO}
                    onChange={(e) => setMoveDateISO(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Move time
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={moveTime}
                    onChange={(e) => setMoveTime(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Distance (km)
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={distanceKm}
                    type="number"
                    min={0}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                </label>
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Items count
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={itemsCount}
                    type="number"
                    min={0}
                    onChange={(e) => setItemsCount(Number(e.target.value))}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasPacking}
                  onChange={(e) => setHasPacking(e.target.checked)}
                />
                Add packing service
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasStorage}
                  onChange={(e) => setHasStorage(e.target.checked)}
                />
                Add storage
              </label>

              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                Create quote
              </button>
            </form>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">My quotes</div>
                <div className="text-xs text-zinc-500">{myQuotes.length}</div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {myQuotes.length === 0 ? (
                  <li className="text-zinc-600 dark:text-zinc-400">
                    No quotes yet.
                  </li>
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
                        Expires: {new Date(q.expiresAtMs).toLocaleString()}
                      </div>
                      <div className="mt-2 font-semibold">
                        ${(q.totalCents / 100).toFixed(2)}
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {q.input.fromAddress} → {q.input.toAddress} (
                        {q.input.distanceKm}km, {q.input.itemsCount} items)
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                Next: UC-03 will confirm a booking based on an active quote.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
