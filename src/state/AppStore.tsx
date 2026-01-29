"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { MockDb } from "@/src/mockDb/types";
import { getDb, resetDb } from "@/src/mockDb/db";

type AppState = {
  db: MockDb;
};

type Action =
  | { type: "db/reset" }
  | { type: "auth/login"; payload: { email: string; password: string } }
  | { type: "auth/logout" }
  | {
      type: "inventory/add";
      payload: { name: string; quantity: number; unit?: string };
    }
  | { type: "inventory/remove"; payload: { id: string } }
  | {
      type: "availability/add";
      payload: {
        employeeName: string;
        dateISO: string;
        startTime: string;
        endTime: string;
      };
    }
  | { type: "availability/remove"; payload: { id: string } }
  | {
      type: "feedback/add";
      payload: {
        context: "post_service" | "declined_quote" | "expired_quote";
        rating?: 1 | 2 | 3 | 4 | 5;
        message: string;
      };
    }
  | {
      type: "quote/create";
      payload: {
        fromAddress: string;
        toAddress: string;
        moveDateISO: string;
        moveTime: string;
        distanceKm: number;
        itemsCount: number;
        hasPacking: boolean;
        hasStorage: boolean;
      };
    }
  | { type: "quote/expireSweep"; payload?: { nowMs?: number } }
  | {
      type: "booking/confirm";
      payload: { quoteId: string; depositCents: number };
    };

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function calcQuoteTotalCents(input: {
  distanceKm: number;
  itemsCount: number;
  hasPacking: boolean;
  hasStorage: boolean;
}) {
  const base = 7500; // $75 base
  const perKm = Math.round(input.distanceKm * 150); // $1.50/km
  const perItem = input.itemsCount * 200; // $2/item
  const packing = input.hasPacking ? 5000 : 0; // $50
  const storage = input.hasStorage ? 2500 : 0; // $25
  return base + perKm + perItem + packing + storage;
}

function reducer(state: AppState, action: Action): AppState {
  const db = state.db;

  switch (action.type) {
    case "db/reset": {
      return { db: resetDb() };
    }

    case "auth/login": {
      const { email, password } = action.payload;
      const user = db.users.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.password === password,
      );
      if (!user) return state;
      db.activeUserId = user.id;
      return { db: { ...db } };
    }

    case "auth/logout": {
      db.activeUserId = undefined;
      return { db: { ...db } };
    }

    case "inventory/add": {
      const { name, quantity, unit } = action.payload;
      db.inventory = [
        { id: uid("inv"), name, quantity, unit },
        ...db.inventory,
      ];
      return { db: { ...db } };
    }

    case "inventory/remove": {
      db.inventory = db.inventory.filter((x) => x.id !== action.payload.id);
      return { db: { ...db } };
    }

    case "availability/add": {
      db.availability = [
        { id: uid("av"), ...action.payload },
        ...db.availability,
      ];
      return { db: { ...db } };
    }

    case "availability/remove": {
      db.availability = db.availability.filter(
        (x) => x.id !== action.payload.id,
      );
      return { db: { ...db } };
    }

    case "feedback/add": {
      const activeUserId = db.activeUserId;
      db.feedback = [
        {
          id: uid("fb"),
          createdAtMs: Date.now(),
          userId: activeUserId,
          ...action.payload,
        },
        ...db.feedback,
      ];
      return { db: { ...db } };
    }

    case "quote/create": {
      const userId = db.activeUserId;
      if (!userId) return state;
      const createdAtMs = Date.now();
      const expiresAtMs = createdAtMs + 24 * 60 * 60 * 1000;
      const totalCents = calcQuoteTotalCents(action.payload);
      db.quotes = [
        {
          id: uid("q"),
          userId,
          createdAtMs,
          expiresAtMs,
          input: action.payload,
          totalCents,
          status: "active",
        },
        ...db.quotes,
      ];
      return { db: { ...db } };
    }

    case "quote/expireSweep": {
      const nowMs = action.payload?.nowMs ?? Date.now();
      db.quotes = db.quotes.map((q) =>
        q.status === "active" && q.expiresAtMs <= nowMs
          ? { ...q, status: "expired" }
          : q,
      );
      return { db: { ...db } };
    }

    case "booking/confirm": {
      const userId = db.activeUserId;
      if (!userId) return state;
      const quote = db.quotes.find((q) => q.id === action.payload.quoteId);
      if (!quote) return state;
      if (quote.status !== "active" && quote.status !== "accepted")
        return state;

      // In this mocked version, accepting == confirming.
      quote.status = "accepted";

      db.bookings = [
        {
          id: uid("b"),
          userId,
          quoteId: quote.id,
          createdAtMs: Date.now(),
          status: "confirmed",
          depositCents: action.payload.depositCents,
          scheduledSlotId: uid("slot"),
        },
        ...db.bookings,
      ];

      return { db: { ...db } };
    }

    default:
      return state;
  }
}

const AppStoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    db: getDb(),
  }));

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}
