import type { NotificationRecord } from "@/src/mockDb/types";
import type {
  NotificationPayload,
  NotificationRepository,
} from "../shared/types";

export class NotificationService {
  constructor(
    public serviceId: number,
    public channel: string,
    private repository?: NotificationRepository,
  ) {}

  sendNotification(
    payload: NotificationPayload,
    now = new Date(),
  ): NotificationRecord | undefined {
    if (!this.repository) return undefined;
    const duplicate = this.repository.findDuplicate({
      type: payload.type,
      recipientUserId: payload.recipientUserId,
      recipientRole: payload.recipientRole,
      relatedQuoteId: payload.relatedQuoteId,
      relatedBookingId: payload.relatedBookingId,
    });
    if (duplicate) return duplicate;

    const nowMs = now.getTime();
    return this.repository.save({
      type: payload.type,
      title: payload.title,
      serviceId: this.serviceId,
      channel: payload.channel ?? this.channel,
      message: payload.message,
      status: "sent",
      createdAtMs: nowMs,
      scheduledForMs: nowMs,
      sentAtMs: nowMs,
      recipientRole: payload.recipientRole,
      recipientUserId: payload.recipientUserId,
      relatedUserId: payload.relatedUserId,
      relatedQuoteId: payload.relatedQuoteId,
      relatedBookingId: payload.relatedBookingId,
    });
  }

  scheduleNotification(
    payload: NotificationPayload,
    now = new Date(),
  ): NotificationRecord | undefined {
    if (!this.repository) return undefined;
    const duplicate = this.repository.findDuplicate({
      type: payload.type,
      recipientUserId: payload.recipientUserId,
      recipientRole: payload.recipientRole,
      relatedQuoteId: payload.relatedQuoteId,
      relatedBookingId: payload.relatedBookingId,
    });
    if (duplicate) return duplicate;

    const nowMs = now.getTime();
    const scheduledForMs = (payload.scheduledFor ?? now).getTime();
    const shouldSendNow = scheduledForMs <= nowMs;

    return this.repository.save({
      type: payload.type,
      title: payload.title,
      serviceId: this.serviceId,
      channel: payload.channel ?? this.channel,
      message: payload.message,
      status: shouldSendNow ? "sent" : "queued",
      createdAtMs: nowMs,
      scheduledForMs,
      sentAtMs: shouldSendNow ? nowMs : undefined,
      recipientRole: payload.recipientRole,
      recipientUserId: payload.recipientUserId,
      relatedUserId: payload.relatedUserId,
      relatedQuoteId: payload.relatedQuoteId,
      relatedBookingId: payload.relatedBookingId,
    });
  }

  runHourlyCheck(now = new Date()): NotificationRecord[] {
    if (!this.repository) return [];
    const nowMs = now.getTime();
    return this.repository
      .list()
      .filter(
        (notification) =>
          notification.status === "queued" &&
          notification.scheduledForMs <= nowMs,
      )
      .map((notification) =>
        this.repository?.update(notification.id, {
          status: "sent",
          sentAtMs: nowMs,
        }),
      )
      .filter((record): record is NotificationRecord => Boolean(record));
  }

  GenerateNotificationMessage(message: string): string {
    return message.trim();
  }

  LogDeliveryStatus(): void {}
}
