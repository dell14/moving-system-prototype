import {
  Client,
  InventoryItem,
  NotificationService,
  OperationsManager,
  Quote,
} from "@/src/classes";
import {
  addHoursToTime,
  getDayOfWeek,
  parseNumericId,
  parseTimeToMinutes,
  shiftToWindow,
  uniqueNonEmpty,
} from "@/src/classes/shared/utils";
import type { MockDb, QuoteInput } from "@/src/mockDb/types";
import {
  toDbBooking,
  toDbPayment,
  toDbQuote,
  toDbServiceSlot,
  toDbUser,
  toDomainFeedback,
  toDomainInventoryItem,
  toDomainQuote,
  toDomainServiceSlot,
  toDomainUser,
} from "@/src/mappers";
import { createFeedbackRepository } from "@/src/repositories/FeedbackRepository";
import { createInventoryRepository } from "@/src/repositories/InventoryRepository";
import { createNotificationRepository } from "@/src/repositories/NotificationRepository";

type IdFactory = (prefix: string) => string;

const QUOTE_EXPIRY_WINDOW_MS = 3 * 60 * 1000;
const DEFAULT_QUOTE_EXPIRING_SOON_WINDOW_MS = 60 * 1000;
const QUOTE_EXPIRING_SOON_WINDOW_MS = (() => {
  const envValue = Number(process.env.NEXT_PUBLIC_QUOTE_EXPIRING_SOON_WINDOW_MS ?? "");
  if (Number.isFinite(envValue) && envValue > 0) return envValue;
  return DEFAULT_QUOTE_EXPIRING_SOON_WINDOW_MS;
})();
const DEFAULT_REQUIRED_DEPOSIT_CENTS = 5000;

function findActiveUser(db: MockDb) {
  if (!db.activeUserId) return undefined;
  return db.users.find((user) => user.id === db.activeUserId);
}

function getManagerUsers(db: MockDb) {
  return db.users.filter((user) => user.role === "manager" || user.role === "owner");
}

function sanitizeInventoryQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.trunc(quantity));
}

function createDomainNotificationService(
  db: MockDb,
  idFactory: IdFactory | undefined,
  nowMs: number,
  channel = "in_app",
) {
  return new NotificationService(
    nowMs,
    channel,
    createNotificationRepository(db, idFactory),
  );
}

function availabilityMatchesWindow(
  shift: "morning" | "evening" | "all_day",
  startTime: string,
  endTime: string,
): boolean {
  const shiftWindow = shiftToWindow(shift);
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const shiftStart = parseTimeToMinutes(shiftWindow.startTime);
  const shiftEnd = parseTimeToMinutes(shiftWindow.endTime);
  if (start < 0 || end < 0 || shiftStart < 0 || shiftEnd < 0) return false;
  return shiftStart <= start && shiftEnd >= end;
}

function collectEmployeeNamesForSlot(
  db: MockDb,
  input: {
    moveDateISO: string;
    startTime: string;
    endTime: string;
    availabilityId?: number;
  },
): string[] {
  const dayOfWeek = getDayOfWeek(input.moveDateISO);
  const directMatch = input.availabilityId
    ? db.availability.find(
        (availability) => parseNumericId(availability.id) === input.availabilityId,
      )
    : undefined;

  const matchingEmployees = db.availability
    .filter(
      (availability) =>
        availability.dayOfWeek === dayOfWeek &&
        availabilityMatchesWindow(
          availability.shift,
          input.startTime,
          input.endTime,
        ),
    )
    .map((availability) => availability.employeeName);

  return uniqueNonEmpty([
    ...(directMatch ? [directMatch.employeeName] : []),
    ...matchingEmployees,
  ]);
}

function buildServiceReminderDate(moveDateISO: string, moveTime: string): Date | undefined {
  const moveStart = new Date(`${moveDateISO}T${moveTime || "10:00"}:00`);
  if (!Number.isFinite(moveStart.getTime())) return undefined;
  return new Date(moveStart.getTime() - 2 * 60 * 60 * 1000);
}

export function calculateQuoteTotalCents(input: {
  distanceKm: number;
  itemsCount: number;
  hasPacking: boolean;
  hasStorage: boolean;
}): number {
  return Quote.estimateTotalCents(input);
}

export function loginUser(db: MockDb, email: string, password: string): boolean {
  const userRecord = db.users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
  if (!userRecord) return false;
  const userModel = toDomainUser(userRecord);
  if (!userModel.login(password)) return false;
  db.activeUserId = userRecord.id;
  return true;
}

export function registerUser(
  db: MockDb,
  input: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
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
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const normalizedPhoneNumber = Number.parseInt(
    input.phoneNumber.replace(/\D+/g, "").slice(0, 15),
    10,
  );

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
    phoneNumber: Number.isFinite(normalizedPhoneNumber) ? normalizedPhoneNumber : 0,
    password: input.password,
    name: fullName,
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

export function resetUserPassword(
  db: MockDb,
  email: string,
  newPassword: string,
): boolean {
  const targetUser = db.users.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!targetUser) return false;
  const userModel = toDomainUser(targetUser);
  if (!userModel.resetPassword(newPassword)) return false;
  db.users = db.users.map((user) =>
    user.id === targetUser.id ? toDbUser(userModel, targetUser) : user,
  );
  return true;
}

export function addInventoryItem(
  db: MockDb,
  input: { name: string; quantity: number; unit?: string },
  idFactory: IdFactory,
): void {
  const name = input.name.trim();
  const quantity = sanitizeInventoryQuantity(input.quantity);
  const unit = input.unit?.trim() || undefined;
  if (!name || quantity <= 0) return;

  const activeUser = findActiveUser(db);
  const userModel = activeUser ? toDomainUser(activeUser) : undefined;
  const inventoryRepository = createInventoryRepository(db, idFactory);
  const existingItem = inventoryRepository.findByNameAndUnit(name, unit);

  const itemModel = existingItem
    ? toDomainInventoryItem(existingItem)
    : new InventoryItem({
        recordId: idFactory("inv"),
        itemId: 0,
        itemType: name,
        quantity: 0,
        itemCost: 0,
        unit,
      });

  if (userModel instanceof OperationsManager) {
    userModel.manageInventory({
      action: "add",
      item: itemModel,
      amount: quantity,
      repository: inventoryRepository,
      minimumQuantity: 1,
    });
    return;
  }

  itemModel.addItem(quantity);
  itemModel.saveChanges(inventoryRepository);
}

export function removeInventoryItem(
  db: MockDb,
  inventoryId: string,
  quantity = 1,
): void {
  const amount = sanitizeInventoryQuantity(quantity);
  if (amount <= 0) return;

  const target = db.inventory.find((item) => item.id === inventoryId);
  if (!target) return;

  const activeUser = findActiveUser(db);
  const userModel = activeUser ? toDomainUser(activeUser) : undefined;
  const inventoryRepository = createInventoryRepository(db);
  const itemModel = toDomainInventoryItem(target);

  if (userModel instanceof OperationsManager) {
    userModel.manageInventory({
      action: "remove",
      item: itemModel,
      amount,
      repository: inventoryRepository,
      minimumQuantity: 1,
    });
  } else {
    itemModel.removeItem(amount);
    itemModel.saveChanges(inventoryRepository);
  }

  if (itemModel.quantity <= 0 && itemModel.recordId) {
    inventoryRepository.remove(itemModel.recordId);
  }
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
  const userModel = toDomainUser(activeUser);
  const notificationService = createDomainNotificationService(
    db,
    idFactory,
    nowMs,
    activeUser.preferredNotificationChannel ?? "in_app",
  );
  const totalCents = calculateQuoteTotalCents(input);
  const expirationDateTime = new Date(nowMs + QUOTE_EXPIRY_WINDOW_MS);
  let quoteModel: Quote;

  try {
    if (userModel instanceof Client) {
      quoteModel = userModel.requestQuote(input, {
        quoteId: parseNumericId(quoteId),
        recordId: quoteId,
        userRecordId: activeUser.id,
        requestedAt: new Date(nowMs),
        expirationDateTime,
        totalCents,
      });
      db.users = db.users.map((userRecord) =>
        userRecord.id === activeUser.id ? toDbUser(userModel, userRecord) : userRecord,
      );
    } else {
      quoteModel = Quote.createFromRequest({
        recordId: quoteId,
        quoteId: parseNumericId(quoteId),
        userId: activeUser.id,
        requestedAt: new Date(nowMs),
        expirationDateTime,
        quoteInput: input,
        totalCents,
      });
      quoteModel.generate();
    }
  } catch {
    return false;
  }

  const quoteTemplate = {
    id: quoteId,
    quoteId: parseNumericId(quoteId),
    requestedDateTimeISO: new Date(nowMs).toISOString(),
    startAddress: input.fromAddress,
    endAddress: input.toAddress,
    distance: quoteModel.distanceLabel,
    apartmentSize: quoteModel.apartmentSizeLabel,
    qtyResidents: quoteModel.qtyResidents,
    serviceOption: quoteModel.serviceOption,
    expirationDateTimeISO: quoteModel.expirationDateTime.toISOString(),
    totalCost: quoteModel.totalCost,
    userId: activeUser.id,
    createdAtMs: nowMs,
    expiresAtMs: quoteModel.expirationDateTime.getTime(),
    input,
    totalCents,
    status: quoteModel.status,
  } satisfies MockDb["quotes"][number];

  db.quotes = [toDbQuote(quoteModel, quoteTemplate), ...db.quotes];

  notificationService.sendNotification(
    {
      type: "quote_generated",
      title: "Quote generated",
      message: `Your quote from ${quoteModel.startAddress} to ${quoteModel.endAddress} is ready.`,
      recipientUserId: activeUser.id,
      recipientRole: "customer",
      relatedUserId: activeUser.id,
      relatedQuoteId: quoteId,
    },
    new Date(nowMs),
  );

  notificationService.scheduleNotification(
    {
      type: "quote_expiring_soon",
      title: "Quote expiring soon",
      message: "Your quote will expire soon if it is not booked.",
      recipientUserId: activeUser.id,
      recipientRole: "customer",
      relatedUserId: activeUser.id,
      relatedQuoteId: quoteId,
      scheduledFor: new Date(
        Math.max(
          nowMs,
          quoteModel.expirationDateTime.getTime() - QUOTE_EXPIRING_SOON_WINDOW_MS,
        ),
      ),
    },
    new Date(nowMs),
  );

  notificationService.runHourlyCheck(new Date(nowMs));
  return true;
}

export function updateQuote(
  db: MockDb,
  input: { quoteId: string; updates: QuoteInput },
  nowMs = Date.now(),
): boolean {
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;

  const quoteRecord = db.quotes.find((record) => record.id === input.quoteId);
  if (!quoteRecord || quoteRecord.userId !== activeUser.id) return false;

  const hasPayment = db.payments.some((payment) => payment.quoteId === quoteRecord.id);
  const hasBooking = db.bookings.some((booking) => booking.quoteId === quoteRecord.id);
  const isExpired =
    quoteRecord.status === "expired" || quoteRecord.expiresAtMs <= nowMs;
  if (hasPayment || hasBooking || isExpired || quoteRecord.status === "declined") {
    return false;
  }

  const quoteModel = toDomainQuote(quoteRecord);
  quoteModel.startAddress = input.updates.fromAddress;
  quoteModel.endAddress = input.updates.toAddress;
  quoteModel.moveDateISO = input.updates.moveDateISO;
  quoteModel.moveTime = input.updates.moveTime;
  quoteModel.distanceKm = input.updates.distanceKm;
  quoteModel.itemsCount = input.updates.itemsCount;
  quoteModel.hasPacking = input.updates.hasPacking;
  quoteModel.hasStorage = input.updates.hasStorage;
  quoteModel.qtyResidents = Math.max(1, Math.ceil(input.updates.itemsCount / 15));
  quoteModel.serviceOption =
    input.updates.hasPacking || input.updates.hasStorage
      ? [input.updates.hasPacking ? "packing" : "", input.updates.hasStorage ? "storage" : ""]
          .filter(Boolean)
          .join("+")
      : "move_only";
  quoteModel.totalCost = calculateQuoteTotalCents(input.updates) / 100;
  quoteModel.expirationDateTime = new Date(nowMs + QUOTE_EXPIRY_WINDOW_MS);
  quoteModel.status = "active";
  quoteModel.heldSlotId = undefined;

  try {
    quoteModel.generate();
  } catch {
    return false;
  }

  db.quotes = db.quotes.map((record) =>
    record.id === quoteRecord.id
      ? toDbQuote(quoteModel, {
          ...record,
          input: input.updates,
          totalCents: calculateQuoteTotalCents(input.updates),
          status: "active",
          heldSlotId: undefined,
        })
      : record,
  );

  return true;
}

export function rejectQuote(db: MockDb, quoteId: string): boolean {
  const quoteRecord = db.quotes.find((record) => record.id === quoteId);
  if (!quoteRecord) return false;
  const quoteModel = toDomainQuote(quoteRecord);
  if (!quoteModel.decline()) return false;
  db.quotes = db.quotes.map((record) =>
    record.id === quoteId ? toDbQuote(quoteModel, record) : record,
  );
  return true;
}

export function expireQuotes(
  db: MockDb,
  nowMs = Date.now(),
  idFactory?: IdFactory,
  options?: { skippedQuoteIds?: Iterable<string> },
): void {
  const skippedQuoteIds = new Set(options?.skippedQuoteIds ?? []);
  const notificationService = createDomainNotificationService(
    db,
    idFactory,
    nowMs,
    "in_app",
  );

  db.quotes = db.quotes.map((quoteRecord) => {
    if (skippedQuoteIds.has(quoteRecord.id)) return quoteRecord;
    const quoteModel = toDomainQuote(quoteRecord);
    quoteModel.expire(nowMs);
    return toDbQuote(quoteModel, quoteRecord);
  });

  notificationService.runHourlyCheck(new Date(nowMs));

  db.quotes.forEach((quoteRecord) => {
    if (!quoteRecord.userId || quoteRecord.status !== "expired") return;
    notificationService.sendNotification(
      {
        type: "quote_expired",
        title: "Quote expired",
        message: "Your quote has expired.",
        recipientUserId: quoteRecord.userId,
        recipientRole: "customer",
        relatedUserId: quoteRecord.userId,
        relatedQuoteId: quoteRecord.id,
      },
      new Date(nowMs),
    );
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

  const feedbackRepository = createFeedbackRepository(db, idFactory);
  const feedbackId = idFactory("fb");
  const userModel = toDomainUser(activeUser);
  const feedbackModel = toDomainFeedback({
    id: feedbackId,
    feedbackId: parseNumericId(feedbackId),
    submissionDateISO: new Date(nowMs).toISOString().slice(0, 10),
    review: input.message,
    reason: input.context,
    userId: activeUser.id,
    quoteId,
    createdAtMs: nowMs,
    context: input.context,
    rating: input.rating ?? 3,
    message: input.message,
  });

  if (userModel instanceof Client) {
    return Boolean(userModel.submitFeedback(feedbackModel, feedbackRepository));
  }

  return feedbackModel.submit(feedbackRepository);
}

export function confirmBooking(
  db: MockDb,
  input: { quoteId: string; depositCents: number },
  idFactory: IdFactory,
  nowMs = Date.now(),
): boolean {
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;

  const domainUser = toDomainUser(activeUser);
  const bookingActor =
    domainUser instanceof Client
      ? domainUser
      : new Client({
          recordId: activeUser.id,
          userId: activeUser.userId,
          username: activeUser.username,
          accountStatus: activeUser.accountStatus,
          passwordHash: activeUser.passwordHash || activeUser.password,
          createdDate: new Date(activeUser.createdDateISO),
          firstName: activeUser.firstName,
          lastName: activeUser.lastName,
          email: activeUser.email,
          phoneNumber: activeUser.phoneNumber,
          preferredNotificationChannel:
            activeUser.preferredNotificationChannel ?? "email",
          numberOfServiceRequests: activeUser.numberOfServiceRequests ?? 0,
        });

  const quoteRecord = db.quotes.find((record) => record.id === input.quoteId);
  if (!quoteRecord || quoteRecord.userId !== activeUser.id) return false;
  if (quoteRecord.status !== "active" && quoteRecord.status !== "accepted") {
    return false;
  }
  if (
    db.bookings.some((booking) => booking.quoteId === quoteRecord.id) ||
    db.payments.some((payment) => payment.quoteId === quoteRecord.id)
  ) {
    return false;
  }

  const requiredDepositCents = DEFAULT_REQUIRED_DEPOSIT_CENTS;
  if (input.depositCents < requiredDepositCents) return false;

  const quoteModel = toDomainQuote(quoteRecord);
  const quoteDayOfWeek = getDayOfWeek(quoteRecord.input.moveDateISO);
  const generatedSlots = db.availability
    .filter((availability) => availability.dayOfWeek === quoteDayOfWeek)
    .map((availability) => {
      const slotId = idFactory("slot");
      const slotWindow = shiftToWindow(availability.shift);
      return {
        id: slotId,
        slotId: parseNumericId(slotId),
        availabilityId: parseNumericId(availability.id),
        dateISO: quoteRecord.input.moveDateISO,
        startTime: slotWindow.startTime,
        endTime: slotWindow.endTime,
        status: "available" as const,
      };
    });

  if (generatedSlots.length > 0) {
    db.timeSlots = [...generatedSlots, ...db.timeSlots];
  }

  const availableSlotRecords = db.timeSlots.filter(
    (slotRecord) => slotRecord.status === "available",
  );
  const allAvailableSlots = availableSlotRecords.map((slotRecord) =>
    toDomainServiceSlot(slotRecord),
  );
  const availableSlots = quoteModel.getAvailability(allAvailableSlots);
  let selectedSlot = availableSlots[0];

  if (selectedSlot && selectedSlot.reserve(quoteRecord.id)) {
    db.timeSlots = db.timeSlots.map((slotRecord) =>
      slotRecord.id === selectedSlot.recordId
        ? toDbServiceSlot(selectedSlot, slotRecord)
        : slotRecord,
    );
  }

  if (!selectedSlot) {
    const fallbackSlotId = idFactory("slot");
    const fallbackSlotRecord = {
      id: fallbackSlotId,
      slotId: parseNumericId(fallbackSlotId),
      dateISO: quoteRecord.input.moveDateISO,
      startTime: quoteRecord.input.moveTime,
      endTime: addHoursToTime(quoteRecord.input.moveTime, 2),
      status: "reserved" as const,
      heldByQuoteId: quoteRecord.id,
    };
    db.timeSlots = [fallbackSlotRecord, ...db.timeSlots];
    selectedSlot = toDomainServiceSlot(fallbackSlotRecord);
  }

  const bookingId = idFactory("b");
  const paymentId = idFactory("pay");
  const acceptance = bookingActor.acceptQuote(quoteModel, {
    bookingId: parseNumericId(bookingId),
    bookingRecordId: bookingId,
    paymentId: parseNumericId(paymentId),
    paymentRecordId: paymentId,
    depositCents: input.depositCents,
    currency: "USD",
    userRecordId: activeUser.id,
    quoteRecordId: quoteRecord.id,
    scheduledSlotId: selectedSlot.recordId,
    now: new Date(nowMs),
    requiredDepositCents,
  });

  if (!acceptance.success || !acceptance.booking || !acceptance.payment) {
    return false;
  }

  const managerRecord = getManagerUsers(db)[0];
  const bookingModel = acceptance.booking;

  if (managerRecord) {
    const managerModel = toDomainUser(managerRecord);
    if (managerModel instanceof OperationsManager) {
      const employeeNames = collectEmployeeNamesForSlot(db, {
        moveDateISO: quoteModel.moveDateISO,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        availabilityId: selectedSlot.availabilityId,
      });
      managerModel.scheduleEmployees({
        booking: bookingModel,
        slot: selectedSlot,
        availableEmployeeNames: employeeNames,
        requestedCrewSize: Math.max(
          1,
          Math.min(3, Math.ceil(quoteModel.itemsCount / 20)),
        ),
      });
    }
  }

  quoteModel.heldSlotId = selectedSlot.recordId;
  db.quotes = db.quotes.map((record) =>
    record.id === quoteRecord.id ? toDbQuote(quoteModel, record) : record,
  );

  const bookingTemplate = {
    id: bookingId,
    bookingId: parseNumericId(bookingId),
    userId: activeUser.id,
    quoteId: quoteRecord.id,
    createdAtMs: nowMs,
    confirmedAtMs: nowMs,
    depositRequireAmountCents: requiredDepositCents,
    depositPaidAmountCents: input.depositCents,
    status: "confirmed" as const,
    depositCents: input.depositCents,
    scheduledSlotId: selectedSlot.recordId ?? bookingId,
    assignedEmployeeNames: bookingModel.assignedEmployeeNames,
    schedulingNote: bookingModel.schedulingNote,
  };

  db.bookings = [toDbBooking(bookingModel, bookingTemplate), ...db.bookings];
  db.payments = [
    toDbPayment(acceptance.payment, {
      id: paymentId,
      paymentId: parseNumericId(paymentId),
      bookingId,
      quoteId: quoteRecord.id,
      userId: activeUser.id,
    }),
    ...db.payments,
  ];

  const notificationChannel = bookingActor.preferredNotificationChannel || "email";
  const notificationService = createDomainNotificationService(
    db,
    idFactory,
    nowMs,
    notificationChannel,
  );

  notificationService.sendNotification(
    {
      type: "booking_confirmation",
      title: "Booking confirmed",
      message:
        bookingModel.assignedEmployeeNames.length > 0
          ? `Your booking is confirmed. Assigned crew: ${bookingModel.assignedEmployeeNames.join(", ")}.`
          : "Your booking is confirmed and your deposit was received.",
      recipientUserId: activeUser.id,
      recipientRole: "customer",
      relatedUserId: activeUser.id,
      relatedQuoteId: quoteRecord.id,
      relatedBookingId: bookingId,
      channel: notificationChannel,
    },
    new Date(nowMs),
  );

  const reminderAt = buildServiceReminderDate(
    quoteModel.moveDateISO,
    quoteModel.moveTime,
  );
  if (reminderAt) {
    notificationService.scheduleNotification(
      {
        type: "service_reminder",
        title: "Upcoming move reminder",
        message: `Reminder: your move is scheduled for ${quoteModel.moveDateISO} at ${quoteModel.moveTime}.`,
        recipientUserId: activeUser.id,
        recipientRole: "customer",
        relatedUserId: activeUser.id,
        relatedQuoteId: quoteRecord.id,
        relatedBookingId: bookingId,
        channel: notificationChannel,
        scheduledFor: reminderAt,
      },
      new Date(nowMs),
    );
  }

  if (bookingModel.assignedEmployeeNames.length === 0) {
    getManagerUsers(db).forEach((managerUser) => {
      notificationService.sendNotification(
        {
          type: "no_timeslots_available",
          title: "Manual scheduling required",
          message: `Booking ${bookingId} needs manual employee scheduling review.`,
          recipientUserId: managerUser.id,
          recipientRole: managerUser.role,
          relatedUserId: managerUser.id,
          relatedQuoteId: quoteRecord.id,
          relatedBookingId: bookingId,
        },
        new Date(nowMs),
      );
    });
  }

  notificationService.runHourlyCheck(new Date(nowMs));
  return true;
}

export function markNotificationRead(
  db: MockDb,
  notificationId: string,
  nowMs = Date.now(),
): boolean {
  let didUpdate = false;
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;

  db.notifications = db.notifications.map((notification) => {
    if (notification.id !== notificationId) return notification;
    if (notification.recipientUserId && notification.recipientUserId !== activeUser.id) {
      return notification;
    }
    if (
      notification.recipientRole &&
      notification.recipientRole !== activeUser.role
    ) {
      return notification;
    }
    if (notification.readAtMs) return notification;
    didUpdate = true;
    return {
      ...notification,
      readAtMs: nowMs,
      status: "read",
    };
  });

  return didUpdate;
}

export function markAllNotificationsRead(db: MockDb, nowMs = Date.now()): boolean {
  const activeUser = findActiveUser(db);
  if (!activeUser) return false;
  let didUpdate = false;
  db.notifications = db.notifications.map((notification) => {
    const matchesUser =
      (!notification.recipientUserId || notification.recipientUserId === activeUser.id) &&
      (!notification.recipientRole || notification.recipientRole === activeUser.role);
    if (!matchesUser || notification.readAtMs) return notification;
    didUpdate = true;
    return {
      ...notification,
      readAtMs: nowMs,
      status: "read",
    };
  });
  return didUpdate;
}
