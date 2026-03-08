"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { MockDb } from "@/src/mockDb/types";
import { getDb, resetDb } from "@/src/mockDb/db";
import {
  addAvailability,
  addInventoryItem,
  confirmBooking,
  createQuote,
  expireQuotes,
  loginUser,
  logoutUser,
  registerUser,
  rejectQuote,
  removeAvailability,
  removeInventoryItem,
  submitFeedback,
} from "@/src/domain/workflows";

type AppState = {
  db: MockDb;
};

type Action =
  | { type: "db/reset" }
  | { type: "auth/login"; payload: { email: string; password: string } }
  | {
      type: "auth/register";
      payload: {
        name: string;
        email: string;
        password: string;
        role: "customer" | "manager";
      };
    }
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
        dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
        shift: "morning" | "evening" | "all_day";
      };
    }
  | { type: "availability/remove"; payload: { id: string } }
  | {
      type: "feedback/add";
      payload: {
        context: "post_service" | "declined_quote" | "expired_quote";
        quoteId?: string;
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
  | { type: "quote/reject"; payload: { quoteId: string } }
  | { type: "quote/expireSweep"; payload?: { nowMs?: number } }
  | {
      type: "booking/confirm";
      payload: { quoteId: string; depositCents: number };
    };

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function reducer(state: AppState, action: Action): AppState {
  const db = structuredClone(state.db);

  switch (action.type) {
    case "db/reset": {
      return { db: resetDb() };
    }

    case "auth/login": {
      const didLogin = loginUser(db, action.payload.email, action.payload.password);
      if (!didLogin) return state;
      return { db: { ...db } };
    }

    case "auth/register": {
      const didRegister = registerUser(db, action.payload, uid);
      if (!didRegister) return state;
      return { db: { ...db } };
    }

    case "auth/logout": {
      logoutUser(db);
      return { db: { ...db } };
    }

    case "inventory/add": {
      addInventoryItem(db, action.payload, uid);
      return { db: { ...db } };
    }

    case "inventory/remove": {
      removeInventoryItem(db, action.payload.id);
      return { db: { ...db } };
    }

    case "availability/add": {
      addAvailability(db, action.payload, uid);
      return { db: { ...db } };
    }

    case "availability/remove": {
      removeAvailability(db, action.payload.id);
      return { db: { ...db } };
    }

    case "feedback/add": {
      const didSubmit = submitFeedback(db, action.payload, uid);
      if (!didSubmit) return state;
      return { db: { ...db } };
    }

    case "quote/create": {
      const didCreate = createQuote(db, action.payload, uid);
      if (!didCreate) return state;
      return { db: { ...db } };
    }

    case "quote/reject": {
      const didReject = rejectQuote(db, action.payload.quoteId);
      if (!didReject) return state;
      return { db: { ...db } };
    }

    case "quote/expireSweep": {
      expireQuotes(db, action.payload?.nowMs);
      return { db: { ...db } };
    }

    case "booking/confirm": {
      const didConfirm = confirmBooking(db, action.payload, uid);
      if (!didConfirm) return state;
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

