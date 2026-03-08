export type Id = string;

export type UserRole = "customer" | "manager" | "owner";

export interface User {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  userId: number;
  username: string;
  accountStatus: string;
  passwordHash: string;
  createdDateISO: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: number;
  // Existing compatibility fields retained until full migration.
  password: string; // mock only
  name: string;
  role: UserRole;
  // UML subclass fields stored in the same table for mock persistence.
  preferredNotificationChannel?: string;
  numberOfServiceRequests?: number;
  managerPermissions?: boolean;
  salary?: number;
}

export interface QuoteInput {
  fromAddress: string;
  toAddress: string;
  moveDateISO: string; // YYYY-MM-DD
  moveTime: string; // HH:mm
  distanceKm: number;
  itemsCount: number;
  hasPacking: boolean;
  hasStorage: boolean;
}

export interface Quote {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  quoteId: number;
  requestedDateTimeISO: string;
  startAddress: string;
  endAddress: string;
  distance: string;
  apartmentSize: string;
  qtyResidents: number;
  serviceOption: string;
  expirationDateTimeISO: string;
  totalCost: number;
  status: "active" | "expired" | "accepted" | "declined";
  // Existing compatibility fields retained.
  userId: Id;
  createdAtMs: number;
  expiresAtMs: number; // createdAt + 24h (mocked to 3 minutes in UI)
  input: QuoteInput;
  totalCents: number;
  heldSlotId?: Id; // link to reserved time slot (24h hold)
}

export interface TimeSlot {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  slotId: number;
  availabilityId?: number;
  dateISO: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: "available" | "held" | "reserved";
  heldByQuoteId?: Id;
}

export interface Booking {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  bookingId: number;
  createdAtMs: number;
  confirmedAtMs: number;
  depositRequireAmountCents: number;
  depositPaidAmountCents: number;
  // Existing compatibility fields retained.
  userId: Id;
  quoteId: Id;
  status: "confirmed";
  depositCents: number;
  scheduledSlotId: Id;
}

export interface Payment {
  id: Id;
  paymentId: number;
  bookingId: Id;
  quoteId: Id;
  userId: Id;
  amount: number;
  amountCents: number;
  currency: string;
  processedAtMs: number;
  processedAtISO: string;
  status: string;
}

export interface Feedback {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  feedbackId: number;
  submissionDateISO: string;
  review: string;
  reason: string;
  // Existing compatibility fields retained.
  userId?: Id;
  quoteId?: Id;
  createdAtMs: number;
  context: "post_service" | "declined_quote" | "expired_quote";
  rating?: 1 | 2 | 3 | 4 | 5;
  message: string;
}

export interface NotificationRecord {
  id: Id;
  type: "quote_expiring_soon" | "quote_expired" | "no_timeslots_available" | "booking_confirmation";
  title: string;
  serviceId: number;
  channel: string;
  message: string;
  status: string;
  createdAtMs: number;
  scheduledForMs: number;
  sentAtMs?: number;
  readAtMs?: number;
  recipientRole?: UserRole;
  recipientUserId?: Id;
  relatedUserId?: Id;
  relatedQuoteId?: Id;
  relatedBookingId?: Id;
}

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Shift = "morning" | "evening" | "all_day";

export interface EmployeeAvailability {
  id: Id;
  employeeName: string;
  dayOfWeek: DayOfWeek;
  shift: Shift;
}

export interface InventoryItem {
  // Transitional key used by existing UI and reducers.
  id: Id;
  // UML-aligned fields.
  itemId: number;
  itemType: string;
  quantity: number;
  itemCost: number;
  // Existing compatibility fields retained.
  name: string;
  unit?: string; // e.g., "pcs", "boxes"
}

export interface MockDb {
  schemaVersion: number;
  users: User[];
  quotes: Quote[];
  bookings: Booking[];
  payments: Payment[];
  feedback: Feedback[];
  availability: EmployeeAvailability[];
  timeSlots: TimeSlot[];
  inventory: InventoryItem[];
  notifications: NotificationRecord[];
  activeUserId?: Id;
}
