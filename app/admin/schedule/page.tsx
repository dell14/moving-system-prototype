"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import type { DayOfWeek, Shift } from "@/src/mockDb/types";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "all_day", label: "All Day" },
];

function shiftLabel(shift: Shift): string {
  return SHIFTS.find((s) => s.value === shift)?.label ?? shift;
}

export default function SchedulePage() {
  const { state, dispatch } = useAppStore();

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  // Only managers can access this feature
  const canManage = activeUser?.role === "manager";

  const [employeeName, setEmployeeName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("Monday");
  const [shift, setShift] = useState<Shift>("morning");

  // Group availabilities by employee
  const byEmployee = useMemo(() => {
    const groups: Record<string, typeof state.db.availability> = {};
    for (const a of state.db.availability) {
      if (!groups[a.employeeName]) groups[a.employeeName] = [];
      groups[a.employeeName].push(a);
    }
    return groups;
  }, [state.db.availability]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          ← Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Employee Scheduling (UC-05)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage employee availabilities by day of week and shift.
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
            You're logged in as{" "}
            <span className="font-mono">{activeUser.email}</span> but your role
            is <span className="font-semibold">{activeUser.role}</span>. Only
            managers can access employee scheduling.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add availability form */}
            <form
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={(e) => {
                e.preventDefault();
                if (!employeeName.trim()) return;
                dispatch({
                  type: "availability/add",
                  payload: {
                    employeeName: employeeName.trim(),
                    dayOfWeek,
                    shift,
                  },
                });
                setEmployeeName("");
              }}
            >
              <div className="text-sm font-semibold mb-3">Add Availability</div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Employee Name
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Day of Week
                  </div>
                  <select
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Shift
                  </div>
                  <select
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={shift}
                    onChange={(e) => setShift(e.target.value as Shift)}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button 
                type="submit"
                className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Add Availability
              </button>
            </form>

            {/* Availability list grouped by employee */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">Employee Availabilities</div>
                <div className="text-xs text-zinc-500">
                  {state.db.availability.length} entries
                </div>
              </div>

              {Object.keys(byEmployee).length === 0 ? (
                <p className="text-sm text-zinc-500">No availabilities added yet.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(byEmployee).map(([name, entries]) => (
                    <div key={name}>
                      <div className="font-medium text-sm mb-2">{name}</div>
                      <ul className="space-y-1">
                        {entries.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                          >
                            <span>
                              <span className="font-medium">{a.dayOfWeek}</span>
                              <span className="text-zinc-500 ml-2">
                                ({shiftLabel(a.shift)})
                              </span>
                            </span>
                            <button
                              className="text-xs text-red-600 hover:underline dark:text-red-400"
                              onClick={() =>
                                dispatch({
                                  type: "availability/remove",
                                  payload: { id: a.id },
                                })
                              }
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
