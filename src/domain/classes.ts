import type {
  Booking as DbBooking,
  Feedback as DbFeedback,
  InventoryItem as DbInventoryItem,
  Payment as DbPayment,
  Quote as DbQuote,
  TimeSlot as DbTimeSlot,
  User as DbUser,
  UserRole,
} from "@/src/mockDb/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseNumericId(rawId: string): number {
  const digits = rawId.replace(/\D+/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits.slice(0, 9), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "Unknown", lastName: "User" };
  }
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(" ") : "User",
  };
}

function joinName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function usernameFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

function normalizeQuoteStatus(status: DbQuote["status"]): string {
  return status;
}

function denormalizeQuoteStatus(status: string): DbQuote["status"] {
  if (
    status === "active" ||
    status === "expired" ||
    status === "accepted" ||
    status === "declined"
  ) {
    return status;
  }
  return "active";
}

function toFeedbackContext(reason: string): DbFeedback["context"] {
  if (
    reason === "post_service" ||
    reason === "declined_quote" ||
    reason === "expired_quote"
  ) {
    return reason;
  }
  return "post_service";
}

function defaultUserRoleForModel(model: User): UserRole {
  if (model instanceof OperationsManager) return "manager";
  return "customer";
}

function ensureDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

export class User {
  private sessionActive = false;

  constructor(
    public userId: number,
    public username: string,
    public accountStatus: string,
    public passwordHash: string,
    public createdDate: Date,
    public firstName: string,
    public lastName: string,
    public email: string,
    public phoneNumber: number,
  ) {}

  login(passwordAttempt?: string): boolean {
    if (this.accountStatus !== "active") return false;
    if (typeof passwordAttempt === "string") {
      this.sessionActive = this.authenticate(passwordAttempt);
      return this.sessionActive;
    }
    this.sessionActive = true;
    return true;
  }

  logout(): void {
    this.sessionActive = false;
  }

  activate(): void {
    this.accountStatus = "active";
  }

  deactivate(): void {
    this.accountStatus = "inactive";
    this.sessionActive = false;
  }

  authenticate(passwordAttempt?: string): boolean {
    if (typeof passwordAttempt === "string") {
      return this.passwordHash === passwordAttempt;
    }
    return this.sessionActive;
  }

  resetPassword(nextPasswordHash = ""): void {
    if (nextPasswordHash.trim()) {
      this.passwordHash = nextPasswordHash.trim();
    }
  }
}

export class OperationsManager extends User {
  constructor(
    userId: number,
    username: string,
    accountStatus: string,
    passwordHash: string,
    createdDate: Date,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: number,
    public managerPermissions: boolean,
    public salary: number,
  ) {
    super(
      userId,
      username,
      accountStatus,
      passwordHash,
      createdDate,
      firstName,
      lastName,
      email,
      phoneNumber,
    );
  }

  scheduleEmployees(): void {
    // Hook for manager scheduling workflows.
  }

  manageInventory(): void {
    // Hook for manager inventory workflows.
  }

  reviewFeedback(): void {
    // Hook for manager feedback review workflows.
  }
}

export class Client extends User {
  constructor(
    userId: number,
    username: string,
    accountStatus: string,
    passwordHash: string,
    createdDate: Date,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: number,
    public preferredNotificationChannel: string,
    public numberOfServiceRequests: number,
  ) {
    super(
      userId,
      username,
      accountStatus,
      passwordHash,
      createdDate,
      firstName,
      lastName,
      email,
      phoneNumber,
    );
  }

  requestQuote(quote: Quote): Quote {
    this.numberOfServiceRequests += 1;
    quote.generate();
    return quote;
  }

  acceptQuote(quote: Quote, booking: Booking): Booking {
    quote.accept();
    booking.createBooking();
    booking.confirm();
    return booking;
  }

  submitFeedback(feedback: Feedback): void {
    feedback.submit();
  }
}

export class Quote {
  constructor(
    public quoteId: number,
    public requestedDateTime: Date,
    public startAddress: string,
    public endAddress: string,
    public distance: string,
    public apartmentSize: string,
    public qtyResidents: number,
    public serviceOption: string,
    public expirationDateTime: Date,
    public status: string,
    public totalCost: number,
  ) {}

  generate(): void {
    this.status = "active";
    if (this.expirationDateTime.getTime() <= this.requestedDateTime.getTime()) {
      this.expirationDateTime = new Date(this.requestedDateTime.getTime() + DAY_MS);
    }
  }

  expire(nowMs = Date.now()): void {
    if (this.status === "active" && nowMs >= this.expirationDateTime.getTime()) {
      this.status = "expired";
    }
  }

  accept(): void {
    if (this.status === "active") {
      this.status = "accepted";
    }
  }

  getAvailability(slots: ServiceSlot[] = []): ServiceSlot[] {
    return slots.filter((slot) => slot.confirmAvailability());
  }
}

export class ServiceSlot {
  constructor(
    public slotId: number,
    public date: Date,
    public startTime: string,
    public endTime: string,
    public status: string,
  ) {}

  validateAvailability(): void {
    if (!this.startTime || !this.endTime || this.startTime >= this.endTime) {
      throw new Error("Invalid service slot window.");
    }
  }

  confirmAvailability(): boolean {
    return this.status === "available";
  }

  reserve(): boolean {
    if (!this.confirmAvailability()) return false;
    this.status = "reserved";
    return true;
  }
}

export class Booking {
  constructor(
    public bookingId: number,
    public createdAt: Date,
    public confirmedAt: Date,
    public depositRequireAmount: number,
    public depositPaidAmount: number,
  ) {}

  confirm(): void {
    this.confirmedAt = new Date();
  }

  createBooking(): void {
    if (!Number.isFinite(this.createdAt.getTime())) {
      this.createdAt = new Date();
    }
  }
}

export class Payment {
  constructor(
    public paymentId: number,
    public amount: number,
    public currency: string,
    public processedAt: Date,
    public status: string,
  ) {}

  processPayment(): boolean {
    if (!this.validatePayment()) return false;
    this.status = "processed";
    this.processedAt = new Date();
    return true;
  }

  validatePayment(): boolean {
    return this.amount > 0 && this.currency.trim().length > 0;
  }

  refund(): boolean {
    if (this.status !== "processed") return false;
    this.status = "refunded";
    return true;
  }
}

export class Feedback {
  constructor(
    public feedbackId: number,
    public submissionDate: Date,
    public rating: number,
    public review: string,
    public reason: string,
  ) {}

  submit(): boolean {
    if (!this.validate()) return false;
    this.submissionDate = new Date();
    return true;
  }

  validate(): boolean {
    if (!this.review.trim()) return false;
    if (this.rating < 1 || this.rating > 5) return false;
    return true;
  }

  retrieve(): void {
    // This method intentionally keeps retrieval side-effect free in the mock domain.
  }
}

export class InventoryItem {
  constructor(
    public itemId: number,
    public itemType: string,
    public quantity: number,
    public itemCost: number,
  ) {}

  addItem(amount = 1): void {
    this.quantity += Math.max(0, amount);
  }

  removeItem(amount = 1): void {
    this.quantity = Math.max(0, this.quantity - Math.max(0, amount));
  }

  saveChanges(): void {
    // This method exists for parity with persistence-backed implementations.
  }

  checkInventory(): string {
    if (this.quantity <= 0) return `Out of stock: ${this.itemType}`;
    return `${this.itemType} in stock: ${this.quantity}`;
  }
}

export class NotificationService {
  private scheduled: Array<{ message: string; at: Date }> = [];

  constructor(public serviceId: number, public channel: string) {}

  sendNotification(): void {
    // Delivery is mocked; this method remains side-effect safe for local state.
  }

  scheduleNotification(message = "", at: Date = new Date()): void {
    this.scheduled.push({ message, at });
  }

  runHourlyCheck(): void {
    const now = Date.now();
    this.scheduled = this.scheduled.filter((item) => item.at.getTime() > now);
  }
}

export function toDomainUser(record: DbUser): User {
  const nameParts = splitName(record.name);
  const firstName = record.firstName || nameParts.firstName;
  const lastName = record.lastName || nameParts.lastName;
  const createdDate = ensureDate(record.createdDateISO || new Date());
  const baseArgs = [
    record.userId || parseNumericId(record.id),
    record.username || usernameFromEmail(record.email),
    record.accountStatus || "active",
    record.passwordHash || record.password,
    createdDate,
    firstName,
    lastName,
    record.email,
    record.phoneNumber || 0,
  ] as const;

  if (record.role === "manager" || record.role === "owner") {
    return new OperationsManager(
      ...baseArgs,
      record.managerPermissions ?? true,
      record.salary ?? 0,
    );
  }

  return new Client(
    ...baseArgs,
    record.preferredNotificationChannel ?? "email",
    record.numberOfServiceRequests ?? 0,
  );
}

export function toDbUser(model: User, template?: DbUser): DbUser {
  const fullName = joinName(model.firstName, model.lastName);
  const baseRecord: DbUser = {
    id:
      template?.id ??
      `user_${model.userId || Math.floor(Date.now() / 1000)}`,
    userId: model.userId || template?.userId || parseNumericId(template?.id ?? "0"),
    username: model.username || usernameFromEmail(model.email),
    accountStatus: model.accountStatus || "active",
    passwordHash: model.passwordHash,
    createdDateISO: model.createdDate.toISOString(),
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    phoneNumber: model.phoneNumber || 0,
    password: model.passwordHash,
    name: fullName,
    role: template?.role ?? defaultUserRoleForModel(model),
    preferredNotificationChannel: template?.preferredNotificationChannel,
    numberOfServiceRequests: template?.numberOfServiceRequests,
    managerPermissions: template?.managerPermissions,
    salary: template?.salary,
  };

  if (model instanceof Client) {
    baseRecord.preferredNotificationChannel = model.preferredNotificationChannel;
    baseRecord.numberOfServiceRequests = model.numberOfServiceRequests;
  }

  if (model instanceof OperationsManager) {
    baseRecord.managerPermissions = model.managerPermissions;
    baseRecord.salary = model.salary;
  }

  return baseRecord;
}

function parseDistanceFromLabel(distance: string): number {
  const parsed = Number.parseFloat(distance.replace(/[^\d.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseItemsCountFromLabel(apartmentSize: string): number {
  const parsed = Number.parseInt(apartmentSize.replace(/\D+/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveServiceOption(input: DbQuote["input"]): string {
  const options = [
    input.hasPacking ? "packing" : "",
    input.hasStorage ? "storage" : "",
  ].filter(Boolean);
  return options.join("+") || "move_only";
}

export function toDomainQuote(record: DbQuote): Quote {
  const requestedDateTime = ensureDate(record.requestedDateTimeISO || record.createdAtMs);
  const expirationDateTime = ensureDate(record.expirationDateTimeISO || record.expiresAtMs);

  return new Quote(
    record.quoteId || parseNumericId(record.id),
    requestedDateTime,
    record.startAddress || record.input.fromAddress,
    record.endAddress || record.input.toAddress,
    record.distance || `${record.input.distanceKm}km`,
    record.apartmentSize || `${record.input.itemsCount} items`,
    record.qtyResidents || Math.max(1, Math.ceil(record.input.itemsCount / 15)),
    record.serviceOption || deriveServiceOption(record.input),
    expirationDateTime,
    normalizeQuoteStatus(record.status),
    record.totalCost || record.totalCents / 100,
  );
}

export function toDbQuote(model: Quote, template: DbQuote): DbQuote {
  const distanceKmFromModel = parseDistanceFromLabel(model.distance);
  const itemsCountFromModel = parseItemsCountFromLabel(model.apartmentSize);
  const baseInput = template.input;

  return {
    ...template,
    quoteId: model.quoteId || template.quoteId || parseNumericId(template.id),
    requestedDateTimeISO: model.requestedDateTime.toISOString(),
    startAddress: model.startAddress,
    endAddress: model.endAddress,
    distance: model.distance,
    apartmentSize: model.apartmentSize,
    qtyResidents: model.qtyResidents,
    serviceOption: model.serviceOption,
    expirationDateTimeISO: model.expirationDateTime.toISOString(),
    totalCost: model.totalCost,
    createdAtMs: model.requestedDateTime.getTime(),
    expiresAtMs: model.expirationDateTime.getTime(),
    status: denormalizeQuoteStatus(model.status),
    totalCents: Math.round(model.totalCost * 100),
    input: {
      ...baseInput,
      fromAddress: model.startAddress || baseInput.fromAddress,
      toAddress: model.endAddress || baseInput.toAddress,
      distanceKm: distanceKmFromModel || baseInput.distanceKm,
      itemsCount: itemsCountFromModel || baseInput.itemsCount,
    },
  };
}

export function toDomainServiceSlot(record: DbTimeSlot): ServiceSlot {
  return new ServiceSlot(
    record.slotId || parseNumericId(record.id),
    ensureDate(record.dateISO),
    record.startTime,
    record.endTime,
    record.status,
  );
}

export function toDbServiceSlot(model: ServiceSlot, template: DbTimeSlot): DbTimeSlot {
  return {
    ...template,
    slotId: model.slotId || template.slotId || parseNumericId(template.id),
    dateISO: model.date.toISOString().slice(0, 10),
    startTime: model.startTime,
    endTime: model.endTime,
    status:
      model.status === "available" ||
      model.status === "held" ||
      model.status === "reserved"
        ? model.status
        : "available",
  };
}

export function toDomainBooking(record: DbBooking): Booking {
  const createdAt = ensureDate(record.createdAtMs);
  const confirmedAt = ensureDate(record.confirmedAtMs || record.createdAtMs);
  const requiredAmount =
    record.depositRequireAmountCents > 0
      ? record.depositRequireAmountCents / 100
      : record.depositCents / 100;
  const paidAmount =
    record.depositPaidAmountCents > 0
      ? record.depositPaidAmountCents / 100
      : record.depositCents / 100;

  return new Booking(
    record.bookingId || parseNumericId(record.id),
    createdAt,
    confirmedAt,
    requiredAmount,
    paidAmount,
  );
}

export function toDbBooking(model: Booking, template: DbBooking): DbBooking {
  return {
    ...template,
    bookingId: model.bookingId || template.bookingId || parseNumericId(template.id),
    createdAtMs: model.createdAt.getTime(),
    confirmedAtMs: model.confirmedAt.getTime(),
    depositRequireAmountCents: Math.round(model.depositRequireAmount * 100),
    depositPaidAmountCents: Math.round(model.depositPaidAmount * 100),
    depositCents: Math.round(model.depositPaidAmount * 100),
  };
}

export function toDomainPayment(
  paymentId: number,
  depositCents: number,
  currency = "USD",
): Payment {
  return new Payment(paymentId, depositCents / 100, currency, new Date(), "pending");
}

export function toDbPayment(
  model: Payment,
  template: Pick<DbPayment, "id" | "bookingId" | "quoteId" | "userId"> &
    Partial<DbPayment>,
): DbPayment {
  return {
    id: template.id,
    paymentId: model.paymentId || template.paymentId || parseNumericId(template.id),
    bookingId: template.bookingId,
    quoteId: template.quoteId,
    userId: template.userId,
    amount: model.amount,
    amountCents: Math.round(model.amount * 100),
    currency: model.currency,
    processedAtMs: model.processedAt.getTime(),
    processedAtISO: model.processedAt.toISOString(),
    status: model.status,
  };
}

export function toDomainFeedback(record: DbFeedback): Feedback {
  return new Feedback(
    record.feedbackId || parseNumericId(record.id),
    ensureDate(record.submissionDateISO || record.createdAtMs),
    record.rating ?? 3,
    record.review || record.message,
    record.reason || record.context,
  );
}

export function toDbFeedback(model: Feedback, template: DbFeedback): DbFeedback {
  const nextRating =
    model.rating >= 1 && model.rating <= 5
      ? (model.rating as 1 | 2 | 3 | 4 | 5)
      : undefined;

  return {
    ...template,
    feedbackId: model.feedbackId || template.feedbackId || parseNumericId(template.id),
    submissionDateISO: model.submissionDate.toISOString().slice(0, 10),
    review: model.review,
    reason: model.reason,
    createdAtMs: model.submissionDate.getTime(),
    rating: nextRating,
    message: model.review,
    context: toFeedbackContext(model.reason),
  };
}

export function toDomainInventoryItem(record: DbInventoryItem): InventoryItem {
  return new InventoryItem(
    record.itemId || parseNumericId(record.id),
    record.itemType || record.name,
    record.quantity,
    record.itemCost || 0,
  );
}

export function toDbInventoryItem(
  model: InventoryItem,
  template: DbInventoryItem,
): DbInventoryItem {
  return {
    ...template,
    itemId: model.itemId || template.itemId || parseNumericId(template.id),
    itemType: model.itemType,
    itemCost: model.itemCost,
    name: model.itemType,
    quantity: model.quantity,
  };
}
