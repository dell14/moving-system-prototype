import { ServiceSlot } from "@/src/classes";
import type { TimeSlot as DbTimeSlot } from "@/src/mockDb/types";
import { ensureDate, parseNumericId } from "@/src/classes/shared/utils";

export function toDomainServiceSlot(record: DbTimeSlot): ServiceSlot {
  return new ServiceSlot({
    recordId: record.id,
    slotId: record.slotId || parseNumericId(record.id),
    availabilityId: record.availabilityId,
    date: ensureDate(record.dateISO),
    startTime: record.startTime,
    endTime: record.endTime,
    status: record.status,
    heldByQuoteId: record.heldByQuoteId,
  });
}

export function toDbServiceSlot(
  model: ServiceSlot,
  template: DbTimeSlot,
): DbTimeSlot {
  return {
    ...template,
    id: model.recordId ?? template.id,
    slotId: model.slotId || template.slotId || parseNumericId(template.id),
    availabilityId: model.availabilityId,
    dateISO: model.date.toISOString().slice(0, 10),
    startTime: model.startTime,
    endTime: model.endTime,
    status: model.status,
    heldByQuoteId: model.heldByQuoteId,
  };
}
