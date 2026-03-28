"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

function formatTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString();
}

export function AppHeader() {
  const { state, dispatch } = useAppStore();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const activeUser = useMemo(
    () => state.db.users.find((user) => user.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );
  const hydratedActiveUser = hasMounted ? activeUser : undefined;

  const visibleNotifications = useMemo(() => {
    if (!hydratedActiveUser) return [];
    return state.db.notifications
      .filter((notification) => {
        if (
          notification.recipientUserId &&
          notification.recipientUserId !== hydratedActiveUser.id
        ) {
          return false;
        }
        if (
          notification.recipientRole &&
          notification.recipientRole !== hydratedActiveUser.role
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [hydratedActiveUser, state.db.notifications]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((notification) => !notification.readAtMs).length,
    [visibleNotifications],
  );
  const primaryLinks = [
    { href: "/", label: "Home" },
    { href: "/booking", label: "Booking & Deposit" },
    { href: "/feedback", label: "Feedback" },
  ];
  const managerLinks =
    hydratedActiveUser?.role === "manager"
      ? [
          { href: "/admin/schedule", label: "Schedule" },
          { href: "/admin/inventory", label: "Inventory" },
        ]
      : [];

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "quote/expireSweep", payload: { nowMs: Date.now() } });
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <Link className="space-y-0.5" href="/">
            <div className="text-base font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-zinc-50">
              SpeedShift Logistics
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              Moving, delivery, and storage in Montreal
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-5 text-sm">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-slate-700 transition hover:text-slate-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative flex flex-wrap items-center gap-3">
          {managerLinks.length > 0 ? (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
              {managerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          {hydratedActiveUser ? (
            <div className="text-xs text-slate-600 dark:text-zinc-400">
              {hydratedActiveUser.email} ({hydratedActiveUser.role})
            </div>
          ) : (
            <Link
              href="/login"
              className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Log In
            </Link>
          )}
          <Link
            href="/quote"
            className="bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Get a Quote
          </Link>
          <button
            type="button"
            className="text-[11px] text-slate-400 transition hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={() => {
              const shouldReset = window.confirm(
                "Reset all sample data and start from a fresh site state?",
              );
              if (!shouldReset) return;
              setIsPanelOpen(false);
              dispatch({ type: "db/reset" });
            }}
          >
            Reset sample data
          </button>
          {hydratedActiveUser ? (
            <button
              type="button"
              aria-label="Notifications"
              className="relative border border-slate-200 px-2 py-1 text-sm text-slate-700 dark:border-zinc-700 dark:text-zinc-200"
              onClick={() => setIsPanelOpen((current) => !current)}
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M15 18H5.5A1.5 1.5 0 0 1 4 16.5v-.2c0-.8.32-1.56.88-2.12l1.02-1.02A2 2 0 0 0 6.5 11.7V10a5.5 5.5 0 1 1 11 0v1.7a2 2 0 0 0 .59 1.42l1.02 1.02c.56.56.89 1.32.89 2.12v.2A1.5 1.5 0 0 1 18.5 18H15" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {hydratedActiveUser && isPanelOpen ? (
            <div className="absolute right-0 top-12 w-96 border border-slate-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Notifications</div>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() =>
                    dispatch({ type: "notification/markAllRead", payload: { nowMs: Date.now() } })
                  }
                >
                  Mark all read
                </button>
              </div>

              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                {visibleNotifications.length === 0 ? (
                  <li className="rounded-lg border border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700">
                    No notifications.
                  </li>
                ) : (
                  visibleNotifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-[11px] text-zinc-500">
                          {notification.readAtMs ? "Read" : "Unread"}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{formatTimestamp(notification.createdAtMs)}</span>
                        {!notification.readAtMs ? (
                          <button
                            type="button"
                            className="underline"
                            onClick={() =>
                              dispatch({
                                type: "notification/markRead",
                                payload: { notificationId: notification.id, nowMs: Date.now() },
                              })
                            }
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
