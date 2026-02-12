export type Id = string;

export type UserRole = "customer" | "manager" | "owner";

export interface User {
  id: Id;
  email: string;
  password: string; // mock only
  name: string;
  role: UserRole;
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
  id: Id;
  userId: Id;
  createdAtMs: number;
  expiresAtMs: number; // createdAt + 24h (mocked to 3 minutes in UI)
  input: QuoteInput;
  totalCents: number;
  status: "active" | "expired" | "accepted" | "declined";
  heldSlotId?: Id; // link to reserved time slot (24h hold)
}

export interface Booking {
  id: Id;
  userId: Id;
  quoteId: Id;
  createdAtMs: number;
  status: "confirmed";
  depositCents: number;
  scheduledSlotId: Id;
}

export interface Feedback {
  id: Id;
  userId?: Id;
  createdAtMs: number;
  context: "post_service" | "declined_quote" | "expired_quote";
  rating?: 1 | 2 | 3 | 4 | 5;
  message: string;
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

export interface TimeSlot {
  id: Id;
  dateISO: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: "available" | "held" | "reserved";
  heldByQuoteId?: Id;
}

export interface InventoryItem {
  id: Id;
  name: string;
  quantity: number;
  unit?: string; // e.g., "pcs", "boxes"
}

export interface MockDb {
  users: User[];
  quotes: Quote[];
  bookings: Booking[];
  feedback: Feedback[];
  availability: EmployeeAvailability[];
  timeSlots: TimeSlot[];
  inventory: InventoryItem[];
  activeUserId?: Id;
}

