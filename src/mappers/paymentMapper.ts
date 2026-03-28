import { Payment } from "@/src/classes";
import type { Payment as DbPayment } from "@/src/mockDb/types";
import { ensureDate, parseNumericId } from "@/src/classes/shared/utils";

export function toDomainPayment(record: DbPayment): Payment {
  return new Payment({
    recordId: record.id,
    paymentId: record.paymentId || parseNumericId(record.id),
    bookingId: record.bookingId,
    quoteId: record.quoteId,
    userId: record.userId,
    amount: record.amount || record.amountCents / 100,
    currency: record.currency,
    processedAt: ensureDate(record.processedAtISO || record.processedAtMs),
    status:
      record.status === "failed" ||
      record.status === "refunded" ||
      record.status === "pending"
        ? record.status
        : "processed",
  });
}

export function toDbPayment(
  model: Payment,
  template: Pick<DbPayment, "id" | "bookingId" | "quoteId" | "userId"> &
    Partial<DbPayment>,
): DbPayment {
  const processedAt = model.processedAt ?? new Date();
  return {
    id: model.recordId ?? template.id,
    paymentId: model.paymentId || template.paymentId || parseNumericId(template.id),
    bookingId: model.bookingId || template.bookingId,
    quoteId: model.quoteId || template.quoteId,
    userId: model.userId || template.userId,
    amount: model.amount,
    amountCents: Math.round(model.amount * 100),
    currency: model.currency,
    processedAtMs: processedAt.getTime(),
    processedAtISO: processedAt.toISOString(),
    status: model.status,
  };
}
