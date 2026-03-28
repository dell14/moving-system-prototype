import type { BookingStatus } from "../shared/types";
import { DomainValidationError } from "../shared/errors";
import { uniqueNonEmpty } from "../shared/utils";

type BookingProps = {
  recordId?: string;
  bookingId: number;
  userId: string;
  quoteId: string;
  createdAt: Date;
  confirmedAt?: Date;
  depositRequiredAmount: number;
  depositPaidAmount: number;
  status: BookingStatus;
  scheduledSlotId?: string;
  assignedEmployeeNames?: string[];
  schedulingNote?: string;
};

type CreateBookingInput = {
  recordId?: string;
  bookingId: number;
  userId: string;
  quoteId: string;
  createdAt?: Date;
  depositRequiredAmount: number;
  depositPaidAmount?: number;
  status?: BookingStatus;
  scheduledSlotId?: string;
  assignedEmployeeNames?: string[];
  schedulingNote?: string;
};

export class Booking {
  public recordId?: string;
  public bookingId: number;
  public userId: string;
  public quoteId: string;
  public createdAt: Date;
  public confirmedAt?: Date;
  public depositRequiredAmount: number;
  public depositPaidAmount: number;
  public status: BookingStatus;
  public scheduledSlotId?: string;
  public assignedEmployeeNames: string[];
  public schedulingNote?: string;

  constructor(props: BookingProps) {
    this.recordId = props.recordId;
    this.bookingId = props.bookingId;
    this.userId = props.userId;
    this.quoteId = props.quoteId;
    this.createdAt = props.createdAt;
    this.confirmedAt = props.confirmedAt;
    this.depositRequiredAmount = props.depositRequiredAmount;
    this.depositPaidAmount = props.depositPaidAmount;
    this.status = props.status;
    this.scheduledSlotId = props.scheduledSlotId;
    this.assignedEmployeeNames = uniqueNonEmpty(
      props.assignedEmployeeNames ?? [],
    );
    this.schedulingNote = props.schedulingNote;
  }

  static createBooking(input: CreateBookingInput): Booking {
    if (!input.userId.trim()) {
      throw new DomainValidationError("A booking requires a user.");
    }
    if (!input.quoteId.trim()) {
      throw new DomainValidationError("A booking requires a quote.");
    }
    if (
      !Number.isFinite(input.depositRequiredAmount) ||
      input.depositRequiredAmount <= 0
    ) {
      throw new DomainValidationError(
        "A booking requires a positive deposit requirement.",
      );
    }

    return new Booking({
      recordId: input.recordId,
      bookingId: input.bookingId,
      userId: input.userId,
      quoteId: input.quoteId,
      createdAt: input.createdAt ?? new Date(),
      confirmedAt: undefined,
      depositRequiredAmount: input.depositRequiredAmount,
      depositPaidAmount: input.depositPaidAmount ?? 0,
      status: input.status ?? "pending",
      scheduledSlotId: input.scheduledSlotId,
      assignedEmployeeNames: input.assignedEmployeeNames,
      schedulingNote: input.schedulingNote,
    });
  }

  confirm(): boolean {
    if (!this.isSchedulable()) return false;
    if (this.depositRequiredAmount <= 0) return false;
    if (this.depositPaidAmount < this.depositRequiredAmount) return false;
    this.status = "confirmed";
    this.confirmedAt = new Date();
    return true;
  }

  isSchedulable(): boolean {
    return Boolean(
      this.userId.trim() &&
        this.quoteId.trim() &&
        (this.status === "pending" || this.status === "confirmed"),
    );
  }

  assignEmployees(names: string[], note = ""): void {
    this.assignedEmployeeNames = uniqueNonEmpty(names);
    this.schedulingNote = note.trim() || undefined;
  }
}
