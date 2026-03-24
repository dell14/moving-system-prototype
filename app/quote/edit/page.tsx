"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QuoteForm } from "@/src/components/QuoteForm";
import { getQuoteExpiresAtMs } from "@/src/domain/viewAdapters";
import { useAppStore } from "@/src/state/AppStore";

export default function EditQuotePage() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeUser = useMemo(
    () => state.db.users.find((user) => user.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const quote = useMemo(() => {
    if (!quoteId || !activeUser) return undefined;
    return state.db.quotes.find((record) => record.id === quoteId && record.userId === activeUser.id);
  }, [activeUser, quoteId, state.db.quotes]);

  const isPaid = useMemo(() => {
    if (!quote) return false;
    return state.db.payments.some((payment) => payment.quoteId === quote.id);
  }, [quote, state.db.payments]);

  const isExpired = quote ? getQuoteExpiresAtMs(quote) <= nowMs || quote.status === "expired" : false;
  const canEdit = !!quote && !isPaid && !isExpired && quote.status !== "declined";

  if (!quoteId || !quote) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href="/quote">
            ← Back to quote
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            We couldn&apos;t find that quote to edit.
          </div>
        </main>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-xl space-y-4">
          <Link className="text-sm underline" href={`/quote?quoteId=${quote.id}`}>
            ← Back to quote
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            This quote can no longer be edited because it has expired, been declined, or already been paid.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm underline" href={`/quote?quoteId=${quote.id}`}>
            ← Back to quote
          </Link>
          <div className="text-xs text-zinc-500">Quote ID {quote.id}</div>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Edit quote</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Update the move details below and we&apos;ll recalculate your quote before payment.
          </p>
        </header>

        <QuoteForm
          key={quote.id}
          initialValues={quote.input}
          heading="Quote form"
          submitLabel="Save quote changes"
          notice="You are editing your quote."
          warning="Editing may change the final price and availability."
          onSubmit={(values) => {
            dispatch({
              type: "quote/update",
              payload: {
                quoteId: quote.id,
                updates: values,
              },
            });
            router.push(`/quote?quoteId=${quote.id}&edited=1`);
          }}
        />
      </main>
    </div>
  );
}
