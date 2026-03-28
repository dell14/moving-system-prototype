import type { MockDb, NotificationRecord } from "@/src/mockDb/types";
import type {
  NotificationDraft,
  NotificationRepository,
} from "@/src/classes/shared/types";
import { parseNumericId } from "@/src/classes/shared/utils";

export function createNotificationRepository(
  db: MockDb,
  idFactory?: (prefix: string) => string,
): NotificationRepository {
  return {
    save(draft: NotificationDraft) {
      const id =
        draft.id ?? idFactory?.("ntf") ?? `ntf_${Date.now().toString(16)}`;
      const record: NotificationRecord = {
        id,
        type: draft.type,
        title: draft.title,
        serviceId: draft.serviceId || parseNumericId(id),
        channel: draft.channel,
        message: draft.message,
        status: draft.status,
        createdAtMs: draft.createdAtMs,
        scheduledForMs: draft.scheduledForMs,
        sentAtMs: draft.sentAtMs,
        readAtMs: draft.readAtMs,
        recipientRole: draft.recipientRole,
        recipientUserId: draft.recipientUserId,
        relatedUserId: draft.relatedUserId,
        relatedQuoteId: draft.relatedQuoteId,
        relatedBookingId: draft.relatedBookingId,
      };

      const existingIndex = db.notifications.findIndex((note) => note.id === id);
      if (existingIndex >= 0) {
        db.notifications = db.notifications.map((note) =>
          note.id === id ? record : note,
        );
      } else {
        db.notifications = [record, ...db.notifications];
      }

      return record;
    },

    list() {
      return db.notifications;
    },

    update(id: string, updates: Partial<NotificationRecord>) {
      let updated: NotificationRecord | undefined;
      db.notifications = db.notifications.map((note) => {
        if (note.id !== id) return note;
        updated = { ...note, ...updates };
        return updated;
      });
      return updated;
    },

    findDuplicate(match) {
      return db.notifications.find(
        (note) =>
          note.type === match.type &&
          note.recipientUserId === match.recipientUserId &&
          note.recipientRole === match.recipientRole &&
          note.relatedQuoteId === match.relatedQuoteId &&
          note.relatedBookingId === match.relatedBookingId,
      );
    },
  };
}
