import { Quote } from "@/src/classes";
import type { Quote as DbQuote } from "@/src/mockDb/types";
import {
  ensureDate,
  normalizeQuoteStatus,
  parseNumericId,
} from "@/src/classes/shared/utils";

export function toDomainQuote(record: DbQuote): Quote {
  return new Quote({
    recordId: record.id,
    quoteId: record.quoteId || parseNumericId(record.id),
    userId: record.userId,
    requestedDateTime: ensureDate(
      record.requestedDateTimeISO || record.createdAtMs,
    ),
    moveDateISO:
      record.input.moveDateISO ||
      ensureDate(record.requestedDateTimeISO || record.createdAtMs)
        .toISOString()
        .slice(0, 10),
    moveTime: record.input.moveTime || "10:00",
    startAddress: record.startAddress || record.input.fromAddress,
    endAddress: record.endAddress || record.input.toAddress,
    distanceKm: record.input.distanceKm,
    itemsCount: record.input.itemsCount,
    hasPacking: record.input.hasPacking,
    hasStorage: record.input.hasStorage,
    qtyResidents:
      record.qtyResidents || Math.max(1, Math.ceil(record.input.itemsCount / 15)),
    serviceOption:
      record.serviceOption ||
      (record.input.hasPacking || record.input.hasStorage
        ? [
            record.input.hasPacking ? "packing" : "",
            record.input.hasStorage ? "storage" : "",
          ]
            .filter(Boolean)
            .join("+")
        : "move_only"),
    expirationDateTime: ensureDate(
      record.expirationDateTimeISO || record.expiresAtMs,
    ),
    status: normalizeQuoteStatus(record.status),
    totalCost: record.totalCost || record.totalCents / 100,
    heldSlotId: record.heldSlotId,
  });
}

export function toDbQuote(model: Quote, template: DbQuote): DbQuote {
  return {
    ...template,
    id: model.recordId ?? template.id,
    quoteId: model.quoteId || template.quoteId || parseNumericId(template.id),
    requestedDateTimeISO: model.requestedDateTime.toISOString(),
    startAddress: model.startAddress,
    endAddress: model.endAddress,
    distance: model.distanceLabel,
    apartmentSize: model.apartmentSizeLabel,
    qtyResidents: model.qtyResidents,
    serviceOption: model.serviceOption,
    expirationDateTimeISO: model.expirationDateTime.toISOString(),
    totalCost: model.totalCost,
    status: model.status,
    userId: model.userId,
    createdAtMs: model.requestedDateTime.getTime(),
    expiresAtMs: model.expirationDateTime.getTime(),
    input: model.input,
    totalCents: Math.round(model.totalCost * 100),
    heldSlotId: model.heldSlotId,
  };
}
