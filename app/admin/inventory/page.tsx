"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/src/state/AppStore";
import { checkInventory } from "@/src/features/inventory/checkInventory";

export default function InventoryPage() {
  const { state, dispatch } = useAppStore();

  const activeUser = useMemo(
    () => state.db.users.find((u) => u.id === state.db.activeUserId),
    [state.db.activeUserId, state.db.users],
  );

  const canManage =
    activeUser?.role === "manager" || activeUser?.role === "owner";

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("pcs");

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link className="text-sm underline" href="/">
          ← Home
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Check inventory (UC-06)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mocked inventory CRUD (add/remove items).
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
            to manager to edit inventory.
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const { enough, message } = checkInventory(state.db.inventory);
              return (
                <div
                  className={`rounded-xl border p-4 text-sm ${
                    enough
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                  }`}
                >
                  <div className="font-medium">
                    {enough ? "Inventory status: OK" : "Inventory status: Low stock"}
                  </div>
                  <textarea
                    readOnly
                    rows={2}
                    value={message}
                    className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-inherit focus:ring-0"
                  />
                </div>
              );
            })()}
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                dispatch({
                  type: "inventory/add",
                  payload: {
                    name: name.trim(),
                    quantity,
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
                    min={0}
                    onChange={(e) => setQuantity(Number(e.target.value))}
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
                  {state.db.inventory.length}
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {state.db.inventory.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{i.name}</div>
                      <button
                        className="text-xs underline"
                        onClick={() =>
                          dispatch({
                            type: "inventory/remove",
                            payload: { id: i.id },
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Qty: {i.quantity} {i.unit ?? ""}
                    </div>
                    <div className="mt-1 font-mono text-xs text-zinc-500">
                      {i.id}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
