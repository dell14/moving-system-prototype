"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { checkInventory } from "@/src/features/inventory/checkInventory";
import { useAppStore } from "@/src/state/AppStore";

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
}

export default function InventoryPage() {
  const { state, dispatch } = useAppStore();

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const canManage =
    activeUser?.role === "manager" || activeUser?.role === "owner";
  const inventoryStatus = useMemo(
    () => checkInventory(state.db.inventory),
    [state.db.inventory],
  );

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("pcs");
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  function getAdjustmentValue(id: string): number {
    return clampQuantity(adjustments[id] ?? 1);
  }

  function setAdjustmentValue(id: string, nextValue: number): void {
    setAdjustments((current) => ({
      ...current,
      [id]: clampQuantity(nextValue),
    }));
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          {"<-"} Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Check inventory (UC-06)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track inventory levels and make quantity adjustments.
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
            You&apos;re logged in as{" "}
            <span className="font-mono">{activeUser.email}</span> but your role
            is <span className="font-semibold">{activeUser.role}</span>. Switch
            to manager to edit inventory.
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 text-sm ${
                inventoryStatus.enough
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              }`}
            >
              <div className="font-medium">
                {inventoryStatus.enough
                  ? "Inventory status: OK"
                  : "Inventory status: Low stock"}
              </div>
              <textarea
                readOnly
                rows={2}
                value={inventoryStatus.message}
                className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-inherit focus:ring-0"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                onSubmit={(e) => {
                  e.preventDefault();
                  const nextName = name.trim();
                  if (!nextName) return;

                  dispatch({
                    type: "inventory/add",
                    payload: {
                      name: nextName,
                      quantity: clampQuantity(quantity),
                      unit: unit.trim() || undefined,
                    },
                  });
                  setName("");
                  setQuantity(1);
                  setUnit("pcs");
                }}
              >
                <div className="text-sm font-semibold">Add item</div>

                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Name
                  </div>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Quantity
                    </div>
                    <input
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      value={quantity}
                      type="number"
                      min={1}
                      step={1}
                      onChange={(e) =>
                        setQuantity(clampQuantity(Number(e.target.value)))
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Unit
                    </div>
                    <input
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </label>
                </div>

                <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                  Save changes
                </button>
              </form>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Inventory</div>
                  <div className="text-xs text-zinc-500">
                    {state.db.inventory.length} item types
                  </div>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {state.db.inventory.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-200 p-3 text-zinc-500 dark:border-zinc-800">
                      No inventory items yet.
                    </li>
                  ) : (
                    state.db.inventory.map((item) => {
                      const adjustment = getAdjustmentValue(item.id);

                      return (
                        <li
                          key={item.id}
                          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Qty: {item.quantity} {item.unit ?? ""}
                            </div>
                          </div>
                          <div className="mt-1 font-mono text-xs text-zinc-500">
                            {item.id}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                              Adjust by
                            </span>
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-800"
                              onClick={() =>
                                setAdjustmentValue(item.id, adjustment - 1)
                              }
                            >
                              -
                            </button>
                            <input
                              className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-xs dark:border-zinc-800 dark:bg-zinc-950"
                              value={adjustment}
                              type="number"
                              min={1}
                              step={1}
                              onChange={(e) =>
                                setAdjustmentValue(
                                  item.id,
                                  Number(e.target.value),
                                )
                              }
                            />
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-800"
                              onClick={() =>
                                setAdjustmentValue(item.id, adjustment + 1)
                              }
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                              onClick={() =>
                                dispatch({
                                  type: "inventory/add",
                                  payload: {
                                    name: item.name,
                                    quantity: adjustment,
                                    unit: item.unit,
                                  },
                                })
                              }
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-800"
                              onClick={() =>
                                dispatch({
                                  type: "inventory/remove",
                                  payload: {
                                    id: item.id,
                                    quantity: adjustment,
                                  },
                                })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
