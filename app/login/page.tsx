"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function LoginPage() {
  const { state, dispatch } = useAppStore();
  const searchParams = useSearchParams();
  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const initialEmail =
    searchParams.get("email") ?? activeUser?.email ?? "customer@example.com";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const showRegisteredMessage = searchParams.get("registered") === "1";

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-lg space-y-6">
        <Link className="text-sm underline" href="/">
          {"<-"} Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Log in (mock)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Demo users: <span className="font-mono">customer@example.com</span>{" "}
            / <span className="font-mono">manager@example.com</span> (password:{" "}
            <span className="font-mono">password</span>)
          </p>
        </header>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          {activeUser ? (
            <div className="space-y-3">
              <p className="text-sm">
                Signed in as <span className="font-semibold">{activeUser.name}</span> (
                <span className="font-mono">{activeUser.email}</span>) {"-"}{" "}
                <span className="font-semibold">
                  {activeUser.role === "manager"
                    ? "Admin (operations manager)"
                    : "Customer"}
                </span>
              </p>
              <button
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                onClick={() => dispatch({ type: "auth/logout" })}
              >
                Log out
              </button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);

                const normalizedEmail = email.trim().toLowerCase();
                const isValid = state.db.users.some(
                  (u) =>
                    u.email.toLowerCase() === normalizedEmail &&
                    u.password === password,
                );

                if (!isValid) {
                  setError("Invalid credentials (mock). Try the demo users.");
                  return;
                }

                dispatch({
                  type: "auth/login",
                  payload: { email: email.trim(), password },
                });
              }}
            >
              {showRegisteredMessage ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Account created. You can log in now.
                </p>
              ) : null}

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
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                Log in
              </button>

              <div className="flex items-center justify-between pt-1 text-sm">
                <Link className="underline" href="/register">
                  Create new account
                </Link>
                <Link className="underline" href="/forgot-password">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
