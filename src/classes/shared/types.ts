import type {
  Feedback as DbFeedback,
  InventoryItem as DbInventoryItem,
  NotificationRecord,
  UserRole,
} from "@/src/mockDb/types";

export type QuoteStatus = "active" | "expired" | "accepted" | "declined";
export type BookingStatus = "pending" | "confirmed";
export type PaymentStatus = "pending" | "processed" | "failed" | "refunded";
export type NotificationType = NotificationRecord["type"];

export type FeedbackReviewFilters = {
  context?: DbFeedback["context"];
  userId?: string;
  quoteId?: string;
  ratingAtLeast?: number;
  ratingAtMost?: number;
  sortBy?: "newest" | "oldest" | "rating_desc" | "rating_asc";
};

export type InventoryCheckResult = {
  itemId: number;
  itemType: string;
  quantity: number;
  minimumQuantity: number;
  status: "ok" | "low" | "out";
  message: string;
};

export type InventoryManagementResult = {
  success: boolean;
  action: "check" | "add" | "remove";
  message: string;
  summary: InventoryCheckResult;
};

export type ScheduleAssignmentResult = {
  success: boolean;
  bookingId: number;
  slotId?: number;
  assignedEmployeeNames: string[];
  note: string;
};

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  channel?: string;
  scheduledFor?: Date;
  recipientRole?: UserRole;
  recipientUserId?: string;
  relatedUserId?: string;
  relatedQuoteId?: string;
  relatedBookingId?: string;
};

export type PersistableFeedback = {
  recordId?: string;
  feedbackId: number;
  userId?: string;
  quoteId?: string;
  submissionDate: Date;
  rating: number;
  review: string;
  reason: string;
  context: DbFeedback["context"];
};

export type PersistableInventoryItem = {
  recordId?: string;
  itemId: number;
  itemType: string;
  quantity: number;
  itemCost: number;
  unit?: string;
};

export type NotificationDraft = {
  id?: string;
  type: NotificationType;
  title: string;
  serviceId: number;
  channel: string;
  message: string;
  status: "queued" | "sent" | "read";
  createdAtMs: number;
  scheduledForMs: number;
  sentAtMs?: number;
  readAtMs?: number;
  recipientRole?: UserRole;
  recipientUserId?: string;
  relatedUserId?: string;
  relatedQuoteId?: string;
  relatedBookingId?: string;
};

export interface FeedbackRepository {
  save(feedback: PersistableFeedback): DbFeedback;
  list(filters?: FeedbackReviewFilters): DbFeedback[];
}

export interface InventoryRepository {
  save(item: PersistableInventoryItem): DbInventoryItem;
  remove(id: string): void;
  list(): DbInventoryItem[];
  findById(id: string): DbInventoryItem | undefined;
  findByNameAndUnit(name: string, unit?: string): DbInventoryItem | undefined;
}

export interface NotificationRepository {
  save(draft: NotificationDraft): NotificationRecord;
  list(): NotificationRecord[];
  update(
    id: string,
    updates: Partial<NotificationRecord>,
  ): NotificationRecord | undefined;
  findDuplicate(
    match: Pick<
      NotificationRecord,
      "type" | "recipientUserId" | "recipientRole" | "relatedQuoteId" | "relatedBookingId"
    >,
  ): NotificationRecord | undefined;
}
