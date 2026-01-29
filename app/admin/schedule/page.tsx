"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";

export default function SchedulePage() {
  const { state, dispatch } = useAppStore();

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const canManage =
    activeUser?.role === "manager" || activeUser?.role === "owner";

  const [employeeName, setEmployeeName] = useState("Driver B");
  // Keep this deterministic for lint purity rules (no Date.now() during render).
  const [dateISO, setDateISO] = useState("2026-02-02");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          ← Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Schedule employees (UC-05)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mocked manager tool: add/remove availability entries.
          </p>
        </header>

        {!activeUser ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            Log in as <span className="font-mono">manager@example.com</span> at{" "}
            <Link className="underline" href="/login">
              /login
            </Link>
            .
          </div>
        ) : !canManage ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            You’re logged in as{" "}
            <span className="font-mono">{activeUser.email}</span> but your role
            is <span className="font-semibold">{activeUser.role}</span>. Switch
            to manager to edit scheduling.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({
                  type: "availability/add",
                  payload: { employeeName, dateISO, startTime, endTime },
                });
              }}
            >
              <div className="text-sm font-semibold">Add availability</div>

              <label className="block space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Employee
                </div>
                <input
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Date
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Start
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    End
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
              </div>

              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                Save availability
              </button>
            </form>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Availability list</div>
                <div className="text-xs text-zinc-500">
                  {state.db.availability.length}
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {state.db.availability.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{a.employeeName}</div>
                      <button
                        className="text-xs underline"
                        onClick={() =>
                          dispatch({
                            type: "availability/remove",
                            payload: { id: a.id },
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {a.dateISO} {a.startTime}–{a.endTime}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
