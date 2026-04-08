"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { MockDb } from "@/src/mockDb/types";
import { loadPersistedDb, resetDb, saveDb } from "@/src/mockDb/db";
import { seedDb } from "@/src/mockDb/seed";
import {
  addAvailability,
  addInventoryItem,
  confirmBooking,
  createQuote,
  expireQuotes,
  loginUser,
  markAllNotificationsRead,
  markNotificationRead,
  logoutUser,
  registerUser,
  rejectQuote,
  removeAvailability,
  removeInventoryItem,
  resetUserPassword,
  submitFeedback,
  updateQuote,
} from "@/src/domain/workflows";

type AppState = {
  db: MockDb;
  pausedQuoteTimer: {
    quoteId: string;
    startedAtMs: number;
  } | null;
};

type Action =
  | { type: "db/hydrate"; payload: { db: MockDb } }
  | { type: "db/reset" }
  | { type: "auth/login"; payload: { email: string; password: string } }
  | {
      type: "auth/register";
      payload: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
        email: string;
        password: string;
        role: "customer" | "manager";
      };
    }
  | {
      type: "auth/resetPassword";
      payload: { email: string; newPassword: string };
    }
  | { type: "auth/logout" }
  | {
      type: "inventory/add";
      payload: { name: string; quantity: number; unit?: string };
    }
  | { type: "inventory/remove"; payload: { id: string; quantity: number } }
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
  | {
      type: "quote/update";
      payload: {
        quoteId: string;
        updates: {
          fromAddress: string;
          toAddress: string;
          moveDateISO: string;
          moveTime: string;
          distanceKm: number;
          itemsCount: number;
          hasPacking: boolean;
          hasStorage: boolean;
        };
      };
    }
  | { type: "quote/reject"; payload: { quoteId: string } }
  | {
      type: "quote/pauseTimer";
      payload: { quoteId: string; startedAtMs?: number };
    }
  | {
      type: "quote/resumeTimer";
      payload: { quoteId: string; resumedAtMs?: number };
    }
  | {
      type: "quote/clearTimerPause";
      payload?: { quoteId?: string };
    }
  | { type: "quote/expireSweep"; payload?: { nowMs?: number } }
  | {
      type: "notification/markRead";
      payload: { notificationId: string; nowMs?: number };
    }
  | { type: "notification/markAllRead"; payload?: { nowMs?: number } }
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
    case "db/hydrate": {
      return { ...state, db: structuredClone(action.payload.db) };
    }

    case "db/reset": {
      return { db: resetDb(), pausedQuoteTimer: null };
    }

    case "auth/login": {
      const didLogin = loginUser(db, action.payload.email, action.payload.password);
      if (!didLogin) return state;
      return { ...state, db: { ...db } };
    }

    case "auth/register": {
      const didRegister = registerUser(db, action.payload, uid);
      if (!didRegister) return state;
      return { ...state, db: { ...db } };
    }

    case "auth/logout": {
      logoutUser(db);
      return { ...state, db: { ...db } };
    }

    case "auth/resetPassword": {
      const didReset = resetUserPassword(
        db,
        action.payload.email,
        action.payload.newPassword,
      );
      if (!didReset) return state;
      return { ...state, db: { ...db } };
    }

    case "inventory/add": {
      addInventoryItem(db, action.payload, uid);
      return { ...state, db: { ...db } };
    }

    case "inventory/remove": {
      removeInventoryItem(db, action.payload.id, action.payload.quantity);
      return { ...state, db: { ...db } };
    }

    case "availability/add": {
      addAvailability(db, action.payload, uid);
      return { ...state, db: { ...db } };
    }

    case "availability/remove": {
      removeAvailability(db, action.payload.id);
      return { ...state, db: { ...db } };
    }

    case "feedback/add": {
      const didSubmit = submitFeedback(db, action.payload, uid);
      if (!didSubmit) return state;
      return { ...state, db: { ...db } };
    }

    case "quote/create": {
      const didCreate = createQuote(db, action.payload, uid);
      if (!didCreate) return state;
      return { ...state, db: { ...db } };
    }

    case "quote/update": {
      const didUpdate = updateQuote(db, action.payload);
      if (!didUpdate) return state;
      return { ...state, db: { ...db } };
    }

    case "quote/reject": {
      const didReject = rejectQuote(db, action.payload.quoteId);
      if (!didReject) return state;
      return { ...state, db: { ...db } };
    }

    case "quote/pauseTimer": {
      const quote = state.db.quotes.find((record) => record.id === action.payload.quoteId);
      if (!quote) return state;
      if (state.pausedQuoteTimer?.quoteId === action.payload.quoteId) return state;
      return {
        ...state,
        pausedQuoteTimer: {
          quoteId: action.payload.quoteId,
          startedAtMs: action.payload.startedAtMs ?? Date.now(),
        },
      };
    }

    case "quote/resumeTimer": {
      const pausedQuoteTimer = state.pausedQuoteTimer;
      if (!pausedQuoteTimer || pausedQuoteTimer.quoteId !== action.payload.quoteId) {
        return state;
      }

      const resumedAtMs = action.payload.resumedAtMs ?? Date.now();
      const elapsedMs = Math.max(0, resumedAtMs - pausedQuoteTimer.startedAtMs);
      const quote = db.quotes.find((record) => record.id === pausedQuoteTimer.quoteId);
      const hasCompletedBooking = db.bookings.some(
        (booking) => booking.quoteId === pausedQuoteTimer.quoteId,
      );
      const hasProcessedPayment = db.payments.some(
        (payment) => payment.quoteId === pausedQuoteTimer.quoteId,
      );

      if (
        quote &&
        elapsedMs > 0 &&
        !hasCompletedBooking &&
        !hasProcessedPayment &&
        quote.status === "active"
      ) {
        const nextExpiresAtMs = quote.expiresAtMs + elapsedMs;
        quote.expiresAtMs = nextExpiresAtMs;
        quote.expirationDateTimeISO = new Date(nextExpiresAtMs).toISOString();
      }

      return { ...state, db: { ...db }, pausedQuoteTimer: null };
    }

    case "quote/clearTimerPause": {
      if (!state.pausedQuoteTimer) return state;
      if (
        action.payload?.quoteId &&
        state.pausedQuoteTimer.quoteId !== action.payload.quoteId
      ) {
        return state;
      }
      return { ...state, pausedQuoteTimer: null };
    }

    case "quote/expireSweep": {
      expireQuotes(db, action.payload?.nowMs, uid, {
        skippedQuoteIds: state.pausedQuoteTimer ? [state.pausedQuoteTimer.quoteId] : [],
      });
      return { ...state, db: { ...db } };
    }

    case "notification/markRead": {
      const didUpdate = markNotificationRead(
        db,
        action.payload.notificationId,
        action.payload.nowMs,
      );
      if (!didUpdate) return state;
      return { ...state, db: { ...db } };
    }

    case "notification/markAllRead": {
      const didUpdate = markAllNotificationsRead(db, action.payload?.nowMs);
      if (!didUpdate) return state;
      return { ...state, db: { ...db } };
    }

    case "booking/confirm": {
      const didConfirm = confirmBooking(db, action.payload, uid);
      if (!didConfirm) return state;
      return { ...state, db: { ...db } };
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
  const hasLoadedPersistedDbRef = useRef(false);
  const hasSkippedInitialSaveRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    // Start from the static seed on both server and client to avoid hydration mismatches.
    db: seedDb(),
    pausedQuoteTimer: null,
  }));

  useEffect(() => {
    const persistedDb = loadPersistedDb();
    if (persistedDb) {
      dispatch({ type: "db/hydrate", payload: { db: persistedDb } });
    }
    hasLoadedPersistedDbRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedDbRef.current) return;
    if (!hasSkippedInitialSaveRef.current) {
      hasSkippedInitialSaveRef.current = true;
      return;
    }
    saveDb(state.db);
  }, [state.db]);

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

