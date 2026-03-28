import { Feedback } from "@/src/classes";
import type { Feedback as DbFeedback } from "@/src/mockDb/types";
import {
  ensureDate,
  normalizeFeedbackContext,
  parseNumericId,
} from "@/src/classes/shared/utils";

export function toDomainFeedback(record: DbFeedback): Feedback {
  return new Feedback({
    recordId: record.id,
    feedbackId: record.feedbackId || parseNumericId(record.id),
    userId: record.userId,
    quoteId: record.quoteId,
    submissionDate: ensureDate(record.submissionDateISO || record.createdAtMs),
    rating: record.rating ?? 3,
    review: record.review || record.message,
    reason: record.reason || record.context,
    context: normalizeFeedbackContext(record.context),
  });
}

export function toDbFeedback(model: Feedback, template: DbFeedback): DbFeedback {
  const nextRating =
    model.rating >= 1 && model.rating <= 5
      ? (model.rating as 1 | 2 | 3 | 4 | 5)
      : 3;

  return {
    ...template,
    id: model.recordId ?? template.id,
    feedbackId:
      model.feedbackId || template.feedbackId || parseNumericId(template.id),
    submissionDateISO: model.submissionDate.toISOString().slice(0, 10),
    review: model.review,
    reason: model.reason,
    userId: model.userId,
    quoteId: model.quoteId,
    createdAtMs: model.submissionDate.getTime(),
    context: model.context,
    rating: nextRating,
    message: model.review,
  };
}
