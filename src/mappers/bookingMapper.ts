import { Booking } from "@/src/classes";
import type { Booking as DbBooking } from "@/src/mockDb/types";
import { ensureDate, parseNumericId } from "@/src/classes/shared/utils";

export function toDomainBooking(record: DbBooking): Booking {
  const depositRequiredAmount =
    record.depositRequireAmountCents > 0
      ? record.depositRequireAmountCents / 100
      : record.depositCents / 100;
  const depositPaidAmount =
    record.depositPaidAmountCents > 0
      ? record.depositPaidAmountCents / 100
      : record.depositCents / 100;

  return new Booking({
    recordId: record.id,
    bookingId: record.bookingId || parseNumericId(record.id),
    userId: record.userId,
    quoteId: record.quoteId,
    createdAt: ensureDate(record.createdAtMs),
    confirmedAt: ensureDate(record.confirmedAtMs, ensureDate(record.createdAtMs)),
    depositRequiredAmount,
    depositPaidAmount,
    status: record.status === "confirmed" ? "confirmed" : "pending",
    scheduledSlotId: record.scheduledSlotId,
    assignedEmployeeNames: record.assignedEmployeeNames,
    schedulingNote: record.schedulingNote,
  });
}

export function toDbBooking(model: Booking, template: DbBooking): DbBooking {
  return {
    ...template,
    id: model.recordId ?? template.id,
    bookingId: model.bookingId || template.bookingId || parseNumericId(template.id),
    userId: model.userId,
    quoteId: model.quoteId,
    createdAtMs: model.createdAt.getTime(),
    confirmedAtMs: model.confirmedAt?.getTime() ?? model.createdAt.getTime(),
    depositRequireAmountCents: Math.round(model.depositRequiredAmount * 100),
    depositPaidAmountCents: Math.round(model.depositPaidAmount * 100),
    status: "confirmed",
    depositCents: Math.round(model.depositPaidAmount * 100),
    scheduledSlotId: model.scheduledSlotId ?? template.scheduledSlotId,
    assignedEmployeeNames: model.assignedEmployeeNames,
    schedulingNote: model.schedulingNote,
  };
}
