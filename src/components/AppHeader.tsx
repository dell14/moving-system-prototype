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

  const activeUser = useMemo(
    () => state.db.users.find((user) => user.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const visibleNotifications = useMemo(() => {
    if (!activeUser) return [];
    return state.db.notifications
      .filter((notification) => {
        if (notification.recipientUserId && notification.recipientUserId !== activeUser.id) {
          return false;
        }
        if (notification.recipientRole && notification.recipientRole !== activeUser.role) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [activeUser, state.db.notifications]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((notification) => !notification.readAtMs).length,
    [visibleNotifications],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "quote/expireSweep", payload: { nowMs: Date.now() } });
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link className="text-sm font-semibold tracking-tight" href="/">
          SpeedShift
        </Link>

        <div className="relative flex items-center gap-4">
          {activeUser ? (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {activeUser.email} ({activeUser.role})
            </div>
          ) : null}
          {activeUser ? (
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700"
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

          {activeUser && isPanelOpen ? (
            <div className="absolute right-0 top-12 w-96 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
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
