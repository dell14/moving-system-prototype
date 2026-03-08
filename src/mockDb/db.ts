import type { DayOfWeek, MockDb, Shift, UserRole } from "./types";
import { seedDb } from "./seed";

const GLOBAL_KEY = "__speedshift_mock_db__";
const STORAGE_KEY = "speedshift_mock_db";
const CURRENT_SCHEMA_VERSION = 3;

type GlobalWithDb = typeof globalThis & {
  [GLOBAL_KEY]?: MockDb;
};

type AnyRecord = Record<string, unknown>;

const getGlobal = () => globalThis as GlobalWithDb;

function parseNumericId(rawId: unknown): number {
  const asString = String(rawId ?? "");
  const digits = asString.replace(/\D+/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits.slice(0, 9), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitName(fullName: unknown): { firstName: string; lastName: string } {
  const normalized = String(fullName ?? "").trim();
  if (!normalized) {
    return { firstName: "Unknown", lastName: "User" };
  }
  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || "User",
  };
}

function asRecord(value: unknown): AnyRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIso(value: unknown, fallbackMs: number): string {
  const parsed =
    typeof value === "string" || typeof value === "number" || value instanceof Date
      ? new Date(value)
      : new Date(fallbackMs);
  if (Number.isNaN(parsed.getTime())) return new Date(fallbackMs).toISOString();
  return parsed.toISOString();
}

function normalizeUserRole(value: string): UserRole {
  if (value === "manager" || value === "owner") return value;
  return "customer";
}

function normalizeQuoteStatus(
  value: string,
): "active" | "expired" | "accepted" | "declined" {
  if (value === "expired" || value === "accepted" || value === "declined") {
    return value;
  }
  return "active";
}

function normalizeFeedbackContext(
  value: string,
): "post_service" | "declined_quote" | "expired_quote" {
  if (value === "declined_quote" || value === "expired_quote") {
    return value;
  }
  return "post_service";
}

function normalizeDayOfWeek(value: string): DayOfWeek {
  if (
    value === "Tuesday" ||
    value === "Wednesday" ||
    value === "Thursday" ||
    value === "Friday" ||
    value === "Saturday" ||
    value === "Sunday"
  ) {
    return value;
  }
  return "Monday";
}

function normalizeShift(value: string): Shift {
  if (value === "evening" || value === "all_day") return value;
  return "morning";
}

function normalizeSlotStatus(value: string): "available" | "held" | "reserved" {
  if (value === "held" || value === "reserved") return value;
  return "available";
}

function parseDistanceKm(distance: unknown): number {
  const parsed = Number.parseFloat(asString(distance).replace(/[^\d.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseItemsCount(apartmentSize: unknown): number {
  const parsed = Number.parseInt(asString(apartmentSize).replace(/\D+/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function migrateDb(rawDb: unknown): MockDb {
  const fallback = seedDb();
  const record = asRecord(rawDb);

  const users = asArray(record.users).map((value) => {
    const user = asRecord(value);
    const name = asString(user.name, "");
    const { firstName, lastName } = splitName(name);
    const email = asString(user.email, "");
    const passwordHash = asString(user.passwordHash, asString(user.password, ""));
    const createdDateISO = toIso(user.createdDateISO, Date.now());
    const role = asString(user.role, "customer");

    return {
      id: asString(user.id, `user_${Date.now()}`),
      userId: asNumber(user.userId, parseNumericId(user.id)),
      username: asString(user.username, email.split("@")[0] || "user"),
      accountStatus: asString(user.accountStatus, "active"),
      passwordHash,
      createdDateISO,
      firstName: asString(user.firstName, firstName),
      lastName: asString(user.lastName, lastName),
      email,
      phoneNumber: asNumber(user.phoneNumber, 0),
      password: asString(user.password, passwordHash),
      name: asString(user.name, `${firstName} ${lastName}`.trim()),
      role: normalizeUserRole(role),
      preferredNotificationChannel:
        user.preferredNotificationChannel === undefined
          ? undefined
          : asString(user.preferredNotificationChannel),
      numberOfServiceRequests:
        user.numberOfServiceRequests === undefined
          ? undefined
          : asNumber(user.numberOfServiceRequests, 0),
      managerPermissions:
        user.managerPermissions === undefined
          ? undefined
          : Boolean(user.managerPermissions),
      salary: user.salary === undefined ? undefined : asNumber(user.salary, 0),
    };
  });

  const quotes = asArray(record.quotes).map((value) => {
    const quote = asRecord(value);
    const input = asRecord(quote.input);
    const createdAtMs = asNumber(quote.createdAtMs, Date.now());
    const expiresAtMs = asNumber(quote.expiresAtMs, createdAtMs + 3 * 60 * 1000);
    const serviceOption = asString(
      quote.serviceOption,
      [
        input.hasPacking ? "packing" : "",
        input.hasStorage ? "storage" : "",
      ]
        .filter(Boolean)
        .join("+") || "move_only",
    );
    const fallbackInput = {
      fromAddress: asString(input.fromAddress, asString(quote.startAddress)),
      toAddress: asString(input.toAddress, asString(quote.endAddress)),
      moveDateISO: asString(input.moveDateISO, toIso(quote.requestedDateTimeISO, createdAtMs).slice(0, 10)),
      moveTime: asString(input.moveTime, "10:00"),
      distanceKm: asNumber(input.distanceKm, parseDistanceKm(quote.distance)),
      itemsCount: asNumber(input.itemsCount, parseItemsCount(quote.apartmentSize)),
      hasPacking: Boolean(input.hasPacking) || serviceOption.includes("packing"),
      hasStorage: Boolean(input.hasStorage) || serviceOption.includes("storage"),
    };
    const totalCents = asNumber(quote.totalCents, asNumber(quote.totalCost, 0) * 100);

    return {
      id: asString(quote.id, `q_${Date.now()}`),
      quoteId: asNumber(quote.quoteId, parseNumericId(quote.id)),
      requestedDateTimeISO: toIso(quote.requestedDateTimeISO, createdAtMs),
      startAddress: asString(quote.startAddress, fallbackInput.fromAddress),
      endAddress: asString(quote.endAddress, fallbackInput.toAddress),
      distance: asString(quote.distance, `${fallbackInput.distanceKm}km`),
      apartmentSize: asString(quote.apartmentSize, `${fallbackInput.itemsCount} items`),
      qtyResidents: asNumber(
        quote.qtyResidents,
        Math.max(1, Math.ceil(fallbackInput.itemsCount / 15)),
      ),
      serviceOption,
      expirationDateTimeISO: toIso(quote.expirationDateTimeISO, expiresAtMs),
      totalCost: asNumber(quote.totalCost, totalCents / 100),
      status: normalizeQuoteStatus(asString(quote.status, "active")),
      userId: asString(quote.userId),
      createdAtMs,
      expiresAtMs,
      input: fallbackInput,
      totalCents,
      heldSlotId: quote.heldSlotId ? asString(quote.heldSlotId) : undefined,
    };
  });

  const bookings = asArray(record.bookings).map((value) => {
    const booking = asRecord(value);
    const createdAtMs = asNumber(booking.createdAtMs, Date.now());
    const depositCents = asNumber(
      booking.depositCents,
      asNumber(booking.depositPaidAmountCents, 0),
    );
    const confirmedAtMs = asNumber(booking.confirmedAtMs, createdAtMs);

    return {
      id: asString(booking.id, `b_${Date.now()}`),
      bookingId: asNumber(booking.bookingId, parseNumericId(booking.id)),
      createdAtMs,
      confirmedAtMs,
      depositRequireAmountCents: asNumber(
        booking.depositRequireAmountCents,
        depositCents,
      ),
      depositPaidAmountCents: asNumber(booking.depositPaidAmountCents, depositCents),
      userId: asString(booking.userId),
      quoteId: asString(booking.quoteId),
      status: "confirmed" as const,
      depositCents,
      scheduledSlotId: asString(booking.scheduledSlotId, `slot_${Date.now()}`),
    };
  });

  const payments = asArray(record.payments).map((value) => {
    const payment = asRecord(value);
    const processedAtMs = asNumber(payment.processedAtMs, Date.now());
    const amountCents = asNumber(
      payment.amountCents,
      Math.round(asNumber(payment.amount, 0) * 100),
    );

    return {
      id: asString(payment.id, `pay_${Date.now()}`),
      paymentId: asNumber(payment.paymentId, parseNumericId(payment.id)),
      bookingId: asString(payment.bookingId),
      quoteId: asString(payment.quoteId),
      userId: asString(payment.userId),
      amount: asNumber(payment.amount, amountCents / 100),
      amountCents,
      currency: asString(payment.currency, "USD"),
      processedAtMs,
      processedAtISO: toIso(payment.processedAtISO, processedAtMs),
      status: asString(payment.status, "processed"),
    };
  });

  const feedback = asArray(record.feedback).map((value) => {
    const item = asRecord(value);
    const createdAtMs = asNumber(item.createdAtMs, Date.now());
    const context = asString(item.context, "post_service");

    return {
      id: asString(item.id, `fb_${Date.now()}`),
      feedbackId: asNumber(item.feedbackId, parseNumericId(item.id)),
      submissionDateISO: asString(
        item.submissionDateISO,
        toIso(item.createdAtMs, createdAtMs).slice(0, 10),
      ),
      review: asString(item.review, asString(item.message)),
      reason: asString(item.reason, context),
      userId: item.userId ? asString(item.userId) : undefined,
      quoteId: item.quoteId ? asString(item.quoteId) : undefined,
      createdAtMs,
      context: normalizeFeedbackContext(context),
      rating: item.rating === undefined ? undefined : (asNumber(item.rating, 3) as 1 | 2 | 3 | 4 | 5),
      message: asString(item.message, asString(item.review)),
    };
  });

  const availability = asArray(record.availability).map((value) => {
    const item = asRecord(value);
    const dayOfWeek = asString(item.dayOfWeek, "Monday");
    const shift = asString(item.shift, "morning");

    return {
      id: asString(item.id, `av_${Date.now()}`),
      employeeName: asString(item.employeeName, "Unknown"),
      dayOfWeek: normalizeDayOfWeek(dayOfWeek),
      shift: normalizeShift(shift),
    };
  });

  const timeSlots = asArray(record.timeSlots).map((value) => {
    const slot = asRecord(value);
    const status = asString(slot.status, "available");

    return {
      id: asString(slot.id, `slot_${Date.now()}`),
      slotId: asNumber(slot.slotId, parseNumericId(slot.id)),
      availabilityId:
        slot.availabilityId === undefined
          ? undefined
          : asNumber(slot.availabilityId, 0),
      dateISO: asString(slot.dateISO, new Date().toISOString().slice(0, 10)),
      startTime: asString(slot.startTime, "10:00"),
      endTime: asString(slot.endTime, "12:00"),
      status: normalizeSlotStatus(status),
      heldByQuoteId: slot.heldByQuoteId ? asString(slot.heldByQuoteId) : undefined,
    };
  });

  const inventory = asArray(record.inventory).map((value) => {
    const item = asRecord(value);
    const itemType = asString(item.itemType, asString(item.name, "Item"));

    return {
      id: asString(item.id, `inv_${Date.now()}`),
      itemId: asNumber(item.itemId, parseNumericId(item.id)),
      itemType,
      quantity: asNumber(item.quantity, 0),
      itemCost: asNumber(item.itemCost, 0),
      name: asString(item.name, itemType),
      unit: item.unit === undefined ? undefined : asString(item.unit),
    };
  });

  const notifications = asArray(record.notifications).map((value) => {
    const note = asRecord(value);
    const typeRaw = asString(note.type, "booking_confirmation");
    const type: "quote_expiring_soon" | "quote_expired" | "no_timeslots_available" | "booking_confirmation" =
      typeRaw === "quote_expiring_soon" ||
      typeRaw === "quote_expired" ||
      typeRaw === "no_timeslots_available" ||
      typeRaw === "booking_confirmation"
        ? typeRaw
        : "booking_confirmation";
    const createdAtMs = asNumber(note.createdAtMs, asNumber(note.scheduledForMs, Date.now()));
    return {
      id: asString(note.id, `ntf_${Date.now()}`),
      type,
      title: asString(note.title, "Notification"),
      serviceId: asNumber(note.serviceId, parseNumericId(note.id)),
      channel: asString(note.channel, "email"),
      message: asString(note.message, ""),
      status: asString(note.status, "queued"),
      createdAtMs,
      scheduledForMs: asNumber(note.scheduledForMs, Date.now()),
      sentAtMs: note.sentAtMs === undefined ? undefined : asNumber(note.sentAtMs, 0),
      readAtMs: note.readAtMs === undefined ? undefined : asNumber(note.readAtMs, 0),
      recipientRole:
        note.recipientRole === undefined
          ? undefined
          : normalizeUserRole(asString(note.recipientRole, "customer")),
      recipientUserId:
        note.recipientUserId === undefined ? undefined : asString(note.recipientUserId),
      relatedUserId:
        note.relatedUserId === undefined ? undefined : asString(note.relatedUserId),
      relatedQuoteId:
        note.relatedQuoteId === undefined ? undefined : asString(note.relatedQuoteId),
      relatedBookingId:
        note.relatedBookingId === undefined ? undefined : asString(note.relatedBookingId),
    };
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    users: users.length > 0 ? users : fallback.users,
    quotes,
    bookings,
    payments,
    feedback,
    availability,
    timeSlots,
    inventory: inventory.length > 0 ? inventory : fallback.inventory,
    notifications,
    activeUserId: record.activeUserId ? asString(record.activeUserId) : undefined,
  };
}

function readDbFromStorage(): MockDb | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return migrateDb(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function persistDbToStorage(db: MockDb): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage failures are non-fatal for mock persistence.
  }
}

export function getDb(): MockDb {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = readDbFromStorage() ?? seedDb();
  }
  g[GLOBAL_KEY] = migrateDb(g[GLOBAL_KEY]);
  return g[GLOBAL_KEY]!;
}

export function resetDb(): MockDb {
  const g = getGlobal();
  g[GLOBAL_KEY] = seedDb();
  persistDbToStorage(g[GLOBAL_KEY]!);
  return g[GLOBAL_KEY]!;
}

export function saveDb(nextDb: MockDb): MockDb {
  const g = getGlobal();
  g[GLOBAL_KEY] = migrateDb(nextDb);
  persistDbToStorage(g[GLOBAL_KEY]!);
  return g[GLOBAL_KEY]!;
}
