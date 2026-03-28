"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function RegisterPage() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (hasSubmitted) return false;
    return [
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      confirmPassword,
    ].some((value) => value.trim().length > 0);
  }, [
    confirmPassword,
    email,
    firstName,
    hasSubmitted,
    lastName,
    password,
    phoneNumber,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const warningMessage =
      "Are you sure you want to leave? Your registration information will be lost.";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warningMessage;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!anchor.href) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, window.location.href);
      const isSamePage =
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (isSamePage) return;

      const shouldLeave = window.confirm(warningMessage);
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-lg space-y-6">
        <Link className="text-sm underline" href="/login">
          {"<-"} Back to login
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Register</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create a new local account and then log in with it.
          </p>
        </header>

        <form
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            const trimmedFirstName = firstName.trim();
            const trimmedLastName = lastName.trim();
            const trimmedPhoneNumber = phoneNumber.trim();
            const trimmedEmail = email.trim();
            const normalizedEmail = trimmedEmail.toLowerCase();
            const normalizedPhoneDigits = trimmedPhoneNumber.replace(/\D+/g, "");

            if (!trimmedFirstName) {
              setError("Please enter your first name.");
              return;
            }

            if (!trimmedLastName) {
              setError("Please enter your last name.");
              return;
            }

            if (!trimmedPhoneNumber) {
              setError("Please enter your phone number.");
              return;
            }

            if (normalizedPhoneDigits.length < 10) {
              setError("Please enter a valid phone number.");
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

            if (!confirmPassword.trim()) {
              setError("Please confirm your password.");
              return;
            }

            if (password !== confirmPassword) {
              setError("Passwords do not match.");
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
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                phoneNumber: trimmedPhoneNumber,
                role: "customer",
                email: trimmedEmail,
                password,
              },
            });

            setHasSubmitted(true);
            dispatch({ type: "auth/logout" });
            router.push(`/login?registered=1&email=${encodeURIComponent(trimmedEmail)}`);
          }}
        >
          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              First name
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Last name
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Phone number
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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

          <label className="block space-y-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Confirm password
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Create account
          </button>
        </form>
      </main>
    </div>
  );
}
