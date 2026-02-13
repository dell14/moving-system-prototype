"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function RegisterPage() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-lg space-y-6">
        <Link className="text-sm underline" href="/login">
          {"<-"} Back to login
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Register (mock)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create a new local account and then log in with it.
          </p>
        </header>

        <form
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            const trimmedName = name.trim();
            const trimmedEmail = email.trim();
            const normalizedEmail = trimmedEmail.toLowerCase();

            if (!trimmedName) {
              setError("Please enter your full name.");
              return;
            }

            if (!trimmedEmail) {
              setError("Please enter your email.");
              return;
            }

            if (!password.trim()) {
              setError("Please enter a password.");
              return;
            }

            const emailExists = state.db.users.some(
              (u) => u.email.toLowerCase() === normalizedEmail,
            );
            if (emailExists) {
              setError("That email is already registered. Try logging in.");
              return;
            }

            dispatch({
              type: "auth/register",
              payload: {
                name: trimmedName,
                role: "customer",
                email: trimmedEmail,
                password,
              },
            });

            dispatch({ type: "auth/logout" });
            router.push(`/login?registered=1&email=${encodeURIComponent(trimmedEmail)}`);
          }}
        >
          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Full name
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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

          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Password
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Create account
          </button>
        </form>
      </main>
    </div>
  );
}
