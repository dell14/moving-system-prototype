import type { MockDb, QuoteInput } from "@/src/mockDb/types";
import {
  Client,
  NotificationService,
  OperationsManager,
  toDbBooking,
  toDbFeedback,
  toDbInventoryItem,
  toDbPayment,
  toDbQuote,
  toDbServiceSlot,
  toDbUser,
  toDomainBooking,
  toDomainFeedback,
  toDomainInventoryItem,
  toDomainPayment,
  toDomainQuote,
  toDomainServiceSlot,
  toDomainUser,
} from "@/src/domain/classes";

type IdFactory = (prefix: string) => string;

const QUOTE_EXPIRY_WINDOW_MS = 3 * 60 * 1000;

function parseNumericId(rawId: string): number {
  const digits = rawId.replace(/\D+/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits.slice(0, 9), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateQuoteTotalCents(input: {
  distanceKm: number;
  itemsCount: number;
  hasPacking: boolean;
  hasStorage: boolean;
}): number {
  const base = 7500; // $75 base
  const perKm = Math.round(input.distanceKm * 150); // $1.50/km
  const perItem = input.itemsCount * 200; // $2/item
  const packing = input.hasPacking ? 5000 : 0; // $50
  const storage = input.hasStorage ? 2500 : 0; // $25
  return base + perKm + perItem + packing + storage;
}

function addHoursToTime(time: string, hours: number): string {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number.parseInt(hourRaw ?? "", 10);
  const minute = Number.parseInt(minuteRaw ?? "", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const totalMinutes = hour * 60 + minute + hours * 60;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const nextMinute = (normalized % 60).toString().padStart(2, "0");
  return `${nextHour}:${nextMinute}`;
}

function findActiveUser(db: MockDb) {
  if (!db.activeUserId) return undefined;
  return db.users.find((user) => user.id === db.activeUserId);
}

export function loginUser(db: MockDb, email: string, password: string): boolean {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return false;
  const userModel = toDomainUser(user);
  if (!userModel.login(password)) return false;
  db.activeUserId = user.id;
  return true;
}

export function registerUser(
  db: MockDb,
  input: {
    name: string;
    email: string;
    password: string;
    role: "customer" | "manager";
  },
  idFactory: IdFactory,
): boolean {
  const existing = db.users.find(
    (user) => user.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (existing) return false;

  const newUserId = idFactory("user");
  const normalizedEmail = input.email.trim();
  const [rawFirstName, ...remaining] = input.name.trim().split(/\s+/);
  const firstName = rawFirstName || "New";
  const lastName = remaining.join(" ") || "User";
  const userRecord = {
    id: newUserId,
    userId: parseNumericId(newUserId),
    username: normalizedEmail.split("@")[0] || normalizedEmail,
    accountStatus: "active",
    passwordHash: input.password,
    createdDateISO: new Date().toISOString(),
    firstName,
    lastName,
    email: normalizedEmail,
    phoneNumber: 0,
    password: input.password,
    name: input.name,
    role: input.role,
    preferredNotificationChannel: input.role === "customer" ? "email" : undefined,
    numberOfServiceRequests: input.role === "customer" ? 0 : undefined,
    managerPermissions: input.role === "manager" ? true : undefined,
    salary: input.role === "manager" ? 0 : undefined,
  };
  const userModel = toDomainUser(userRecord);
  userModel.activate();
  db.users = [toDbUser(userModel, userRecord), ...db.users];
  db.activeUserId = userRecord.id;
  return true;
}

export function logoutUser(db: MockDb): void {
  const activeUser = findActiveUser(db);
  if (activeUser) {
    const userModel = toDomainUser(activeUser);
    userModel.logout();
  }
  db.activeUserId = undefined;
}

export function addInventoryItem(
  db: MockDb,
  input: { name: string; quantity: number; unit?: string },
  idFactory: IdFactory,
): void {
  const inventoryId = idFactory("inv");
  const itemTemplate = {
    id: inventoryId,
    itemId: parseNumericId(inventoryId),
    itemType: input.name,
    name: input.name,
    quantity: input.quantity,
    itemCost: 0,
    unit: input.unit,
  };
  const itemModel = toDomainInventoryItem(itemTemplate);
  itemModel.saveChanges();

  const activeUser = findActiveUser(db);
  if (activeUser) {
    const userModel = toDomainUser(activeUser);
    if (userModel instanceof OperationsManager) {
      userModel.manageInventory();
    }
  }

  db.inventory = [toDbInventoryItem(itemModel, itemTemplate), ...db.inventory];
}

export function removeInventoryItem(db: MockDb, inventoryId: string): void {
  const target = db.inventory.find((item) => item.id === inventoryId);
  if (target) {
    const itemModel = toDomainInventoryItem(target);
    itemModel.removeItem(target.quantity);
    itemModel.saveChanges();
  }
  db.inventory = db.inventory.filter((item) => item.id !== inventoryId);
}

export function addAvailability(
  db: MockDb,
  input: {
    employeeName: string;
    dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    shift: "morning" | "evening" | "all_day";
  },
  idFactory: IdFactory,
): void {
  const activeUser = findActiveUser(db);
  if (activeUser) {
    const userModel = toDomainUser(activeUser);
    if (userModel instanceof OperationsManager) {
      userModel.scheduleEmployees();
    }
  }

  db.availability = [{ id: idFactory("av"), ...input }, ...db.availability];
}

export function removeAvailability(db: MockDb, availabilityId: string): void {
  db.availability = db.availability.filter((item) => item.id !== availabilityId);
}

export function createQuote(
  db: MockDb,
  input: QuoteInput,
  idFactory: IdFactory,
  nowMs = Date.now(),
): boolean {
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;
  const quoteId = idFactory("q");

  const quoteTemplate = {
    id: quoteId,
    quoteId: parseNumericId(quoteId),
    requestedDateTimeISO: new Date(nowMs).toISOString(),
    startAddress: input.fromAddress,
    endAddress: input.toAddress,
    distance: `${input.distanceKm}km`,
    apartmentSize: `${input.itemsCount} items`,
    qtyResidents: Math.max(1, Math.ceil(input.itemsCount / 15)),
    serviceOption: input.hasPacking || input.hasStorage
      ? [input.hasPacking ? "packing" : "", input.hasStorage ? "storage" : ""]
          .filter(Boolean)
          .join("+")
      : "move_only",
    expirationDateTimeISO: new Date(nowMs + QUOTE_EXPIRY_WINDOW_MS).toISOString(),
    totalCost: calculateQuoteTotalCents(input) / 100,
    userId: activeUser.id,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + QUOTE_EXPIRY_WINDOW_MS,
    input,
    totalCents: calculateQuoteTotalCents(input),
    status: "active" as const,
  };
  const quoteModel = toDomainQuote(quoteTemplate);
  const userModel = toDomainUser(activeUser);

  if (userModel instanceof Client) {
    userModel.requestQuote(quoteModel);
    db.users = db.users.map((userRecord) =>
      userRecord.id === activeUser.id ? toDbUser(userModel, userRecord) : userRecord,
    );
  } else {
    quoteModel.generate();
  }

  db.quotes = [toDbQuote(quoteModel, quoteTemplate), ...db.quotes];
  return true;
}

export function rejectQuote(db: MockDb, quoteId: string): boolean {
  const quote = db.quotes.find((record) => record.id === quoteId);
  if (!quote || quote.status !== "active") return false;
  quote.status = "declined";
  return true;
}

export function expireQuotes(db: MockDb, nowMs = Date.now()): void {
  db.quotes = db.quotes.map((quoteRecord) => {
    const quoteModel = toDomainQuote(quoteRecord);
    if (
      quoteModel.status === "active" &&
      quoteModel.expirationDateTime.getTime() <= nowMs
    ) {
      quoteModel.expire(nowMs);
    }
    return toDbQuote(quoteModel, quoteRecord);
  });
}

export function submitFeedback(
  db: MockDb,
  input: {
    context: "post_service" | "declined_quote" | "expired_quote";
    quoteId?: string;
    rating?: 1 | 2 | 3 | 4 | 5;
    message: string;
  },
  idFactory: IdFactory,
  nowMs = Date.now(),
): boolean {
  const activeUser = findActiveUser(db);
  const quoteId = input.quoteId;
  if (!activeUser || !quoteId) return false;

  const quote = db.quotes.find((record) => record.id === quoteId);
  if (!quote || quote.userId !== activeUser.id) return false;

  if (input.context === "post_service") {
    const booking = db.bookings.find((record) => record.quoteId === quoteId);
    if (!booking || booking.userId !== activeUser.id) return false;
  }

  if (input.context === "declined_quote" && quote.status !== "declined") return false;
  if (input.context === "expired_quote" && quote.status !== "expired") return false;

  const alreadySubmitted = db.feedback.some(
    (record) =>
      record.context === input.context &&
      record.userId === activeUser.id &&
      record.quoteId === quoteId,
  );
  if (alreadySubmitted) return false;

  const feedbackId = idFactory("fb");
  const templateFeedback = {
    id: feedbackId,
    feedbackId: parseNumericId(feedbackId),
    submissionDateISO: new Date(nowMs).toISOString().slice(0, 10),
    review: input.message,
    reason: input.context,
    createdAtMs: nowMs,
    userId: activeUser.id,
    ...input,
  };
  const feedbackModel = toDomainFeedback(templateFeedback);
  feedbackModel.reason = input.context;
  if (!feedbackModel.validate()) return false;

  const userModel = toDomainUser(activeUser);
  if (userModel instanceof Client) {
    userModel.submitFeedback(feedbackModel);
  } else if (!feedbackModel.submit()) {
    return false;
  }

  db.feedback = [toDbFeedback(feedbackModel, templateFeedback), ...db.feedback];
  return true;
}

export function confirmBooking(
  db: MockDb,
  input: { quoteId: string; depositCents: number },
  idFactory: IdFactory,
  nowMs = Date.now(),
): boolean {
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;

  const quoteRecord = db.quotes.find((record) => record.id === input.quoteId);
  if (!quoteRecord) return false;
  if (quoteRecord.status !== "active" && quoteRecord.status !== "accepted") {
    return false;
  }

  const quoteModel = toDomainQuote(quoteRecord);
  const paymentModel = toDomainPayment(nowMs, input.depositCents, "USD");
  if (!paymentModel.processPayment()) return false;
  quoteModel.accept();

  const availableSlotRecords = db.timeSlots.filter(
    (slotRecord) => slotRecord.status === "available",
  );
  const allAvailableSlots = availableSlotRecords.map((slotRecord) =>
    toDomainServiceSlot(slotRecord),
  );
  const availableSlots = quoteModel.getAvailability(allAvailableSlots);
  const selectedSlot = availableSlots[0];
  let scheduledSlotId = idFactory("slot");

  if (selectedSlot) {
    try {
      selectedSlot.validateAvailability();
      if (selectedSlot.reserve()) {
        const selectedDateIso = selectedSlot.date.toISOString().slice(0, 10);
        const matchingRecord = availableSlotRecords.find(
          (slotRecord) =>
            slotRecord.dateISO === selectedDateIso &&
            slotRecord.startTime === selectedSlot.startTime &&
            slotRecord.endTime === selectedSlot.endTime,
        );
        if (matchingRecord) {
          scheduledSlotId = matchingRecord.id;
          db.timeSlots = db.timeSlots.map((slotRecord) =>
            slotRecord.id === matchingRecord.id
              ? toDbServiceSlot(selectedSlot, slotRecord)
              : slotRecord,
          );
        }
      }
    } catch {
      // Fall through to creating a reserved slot.
    }
  }

  const slotExists = db.timeSlots.some((slot) => slot.id === scheduledSlotId);
  if (!slotExists) {
    db.timeSlots = [
      {
        id: scheduledSlotId,
        slotId: parseNumericId(scheduledSlotId),
        dateISO: quoteRecord.input.moveDateISO,
        startTime: quoteRecord.input.moveTime,
        endTime: addHoursToTime(quoteRecord.input.moveTime, 2),
        status: "reserved",
      },
      ...db.timeSlots,
    ];
  }

  quoteRecord.heldSlotId = scheduledSlotId;
  db.quotes = db.quotes.map((record) =>
    record.id === quoteRecord.id ? toDbQuote(quoteModel, record) : record,
  );

  const bookingId = idFactory("b");
  const bookingTemplate = {
    id: bookingId,
    bookingId: parseNumericId(bookingId),
    userId: activeUser.id,
    quoteId: quoteRecord.id,
    createdAtMs: nowMs,
    confirmedAtMs: nowMs,
    depositRequireAmountCents: Math.round(paymentModel.amount * 100),
    depositPaidAmountCents: Math.round(paymentModel.amount * 100),
    status: "confirmed" as const,
    depositCents: Math.round(paymentModel.amount * 100),
    scheduledSlotId,
  };
  const bookingModel = toDomainBooking(bookingTemplate);
  bookingModel.depositRequireAmount = paymentModel.amount;
  bookingModel.depositPaidAmount = paymentModel.amount;
  bookingModel.createBooking();
  bookingModel.confirm();

  const notificationService = new NotificationService(nowMs, "email");
  notificationService.sendNotification();
  notificationService.scheduleNotification("booking_confirmation");
  notificationService.runHourlyCheck();

  db.bookings = [toDbBooking(bookingModel, bookingTemplate), ...db.bookings];
  const paymentId = idFactory("pay");
  db.payments = [
    toDbPayment(paymentModel, {
      id: paymentId,
      paymentId: parseNumericId(paymentId),
      bookingId: bookingTemplate.id,
      quoteId: quoteRecord.id,
      userId: activeUser.id,
    }),
    ...db.payments,
  ];

  const notificationId = idFactory("ntf");
  db.notifications = [
    {
      id: notificationId,
      serviceId: nowMs,
      channel: "email",
      message: "booking_confirmation",
      status: "sent",
      scheduledForMs: nowMs,
      sentAtMs: nowMs,
      relatedUserId: activeUser.id,
      relatedQuoteId: quoteRecord.id,
      relatedBookingId: bookingTemplate.id,
    },
    ...db.notifications,
  ];
  return true;
}
