"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function ForgotPasswordPage() {
  const { state } = useAppStore();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-lg space-y-6">
        <Link className="text-sm underline" href="/login">
          {"<-"} Back to login
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Forgot password (mock)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email to simulate a reset flow.
          </p>
        </header>

        <form
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          onSubmit={(e) => {
            e.preventDefault();

            const normalized = email.trim().toLowerCase();
            const exists = state.db.users.some(
              (u) => u.email.toLowerCase() === normalized,
            );

            if (!normalized) {
              setMessage("Please enter an email address.");
              return;
            }

            if (exists) {
              setMessage("Reset link sent (mock). Check your email inbox.");
              return;
            }

            setMessage("No account found for that email.");
          }}
        >
          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {message ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
          ) : null}

          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Send reset link
          </button>
        </form>
      </main>
    </div>
  );
}
