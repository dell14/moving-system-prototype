"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

type QuoteFormErrors = {
  fromAddress?: string;
  toAddress?: string;
  moveDateISO?: string;
  moveTime?: string;
  distanceKm?: string;
  itemsCount?: string;
  form?: string;
};

export default function QuotePage() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
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
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<QuoteFormErrors>({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  const myQuotes = useMemo(() => {
    if (!activeUser) return [];
    return state.db.quotes.filter((q) => q.userId === activeUser.id);
  }, [activeUser, state.db.quotes]);

  const latestQuote = useMemo(() => {
    return myQuotes[0];
  }, [myQuotes]);

  const selectedQuote = useMemo(() => {
    if (!selectedQuoteId) return latestQuote;
    return myQuotes.find((q) => q.id === selectedQuoteId) ?? latestQuote;
  }, [latestQuote, myQuotes, selectedQuoteId]);

  const bookingForSelected = useMemo(() => {
    if (!selectedQuote) return undefined;
    return state.db.bookings.find((b) => b.quoteId === selectedQuote.id);
  }, [selectedQuote, state.db.bookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      dispatch({ type: "quote/expireSweep", payload: { nowMs: now } });
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const timeRemainingMs = selectedQuote
    ? Math.max(0, selectedQuote.expiresAtMs - nowMs)
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
                const nextErrors: QuoteFormErrors = {};
                if (!fromAddress.trim())
                  nextErrors.fromAddress = "Enter a pickup address.";
                if (!toAddress.trim())
                  nextErrors.toAddress = "Enter a drop-off address.";
                if (!moveDateISO.trim())
                  nextErrors.moveDateISO = "Select a move date.";
                if (!moveTime.trim())
                  nextErrors.moveTime = "Select a move time.";
                if (!Number.isFinite(distanceKm) || distanceKm <= 0)
                  nextErrors.distanceKm = "Distance must be greater than 0.";
                if (!Number.isFinite(itemsCount) || itemsCount <= 0)
                  nextErrors.itemsCount = "Items must be greater than 0.";
                if (Object.keys(nextErrors).length > 0) {
                  setFormErrors(nextErrors);
                  return;
                }
                setFormErrors({});
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
                setSelectedQuoteId(null);
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
                {formErrors.fromAddress ? (
                  <p className="text-xs text-red-600">
                    {formErrors.fromAddress}
                  </p>
                ) : null}
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
                {formErrors.toAddress ? (
                  <p className="text-xs text-red-600">{formErrors.toAddress}</p>
                ) : null}
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
                  {formErrors.moveDateISO ? (
                    <p className="text-xs text-red-600">
                      {formErrors.moveDateISO}
                    </p>
                  ) : null}
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
                  {formErrors.moveTime ? (
                    <p className="text-xs text-red-600">
                      {formErrors.moveTime}
                    </p>
                  ) : null}
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
                    min={1}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                  {formErrors.distanceKm ? (
                    <p className="text-xs text-red-600">
                      {formErrors.distanceKm}
                    </p>
                  ) : null}
                </label>
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Items count
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={itemsCount}
                    type="number"
                    min={1}
                    onChange={(e) => setItemsCount(Number(e.target.value))}
                  />
                  {formErrors.itemsCount ? (
                    <p className="text-xs text-red-600">
                      {formErrors.itemsCount}
                    </p>
                  ) : null}
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
                  <div className="text-sm font-semibold">
                    Accept quote & pay deposit (mock)
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    After generating a quote, confirm it here without leaving the
                    page.
                  </p>
                </div>
                {selectedQuote ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-900">
                    Quote {selectedQuote.id}
                  </span>
                ) : null}
              </div>

              {!selectedQuote ? (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  Generate a quote to see the deposit and booking flow.
                </div>
              ) : bookingForSelected ? (
                <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950">
                  <div className="font-semibold">Reservation confirmed</div>
                  <div>
                    Booking ID:{" "}
                    <span className="font-mono">{bookingForSelected.id}</span>
                  </div>
                  <div>
                    Deposit paid: $
                    {(bookingForSelected.depositCents / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-900/80 dark:text-emerald-100/70">
                    We’ll hold your time slot and follow up with the operations
                    manager.
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Quote total</span>
                      <span className="font-semibold">
                        ${(selectedQuote.totalCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      Confirm this quote to reserve your move. A refundable
                      deposit is required.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>Mock 24h timer (3 min):</span>
                      {selectedQuote.status === "expired" ||
                      timeRemainingMs === 0 ? (
                        <span className="font-semibold text-red-600">
                          Quote expired
                        </span>
                      ) : (
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {timeRemainingLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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
                        dispatch({
                          type: "quote/reject",
                          payload: { quoteId: selectedQuote.id },
                        });
                      }}
                    >
                      Reject quote
                    </button>
                  </div>
                  {selectedQuote.status === "declined" ? (
                    <p className="text-xs text-zinc-500">
                      You declined this quote.
                    </p>
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
