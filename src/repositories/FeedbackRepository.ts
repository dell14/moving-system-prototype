import type { Feedback as DbFeedback, MockDb } from "@/src/mockDb/types";
import type {
  FeedbackRepository,
  FeedbackReviewFilters,
  PersistableFeedback,
} from "@/src/classes/shared/types";
import { parseNumericId } from "@/src/classes/shared/utils";

function matchesFilters(
  record: DbFeedback,
  filters?: FeedbackReviewFilters,
): boolean {
  if (filters?.context && record.context !== filters.context) return false;
  if (filters?.userId && record.userId !== filters.userId) return false;
  if (filters?.quoteId && record.quoteId !== filters.quoteId) return false;
  if (
    filters?.ratingAtLeast !== undefined &&
    (record.rating ?? 0) < filters.ratingAtLeast
  ) {
    return false;
  }
  if (
    filters?.ratingAtMost !== undefined &&
    (record.rating ?? 0) > filters.ratingAtMost
  ) {
    return false;
  }
  return true;
}

function sortFeedback(
  records: DbFeedback[],
  sortBy: FeedbackReviewFilters["sortBy"],
): DbFeedback[] {
  const sorted = [...records];
  if (sortBy === "oldest") {
    sorted.sort((a, b) => a.createdAtMs - b.createdAtMs);
    return sorted;
  }
  if (sortBy === "rating_asc") {
    sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    return sorted;
  }
  if (sortBy === "rating_desc") {
    sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return sorted;
  }
  sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return sorted;
}

export function createFeedbackRepository(
  db: MockDb,
  idFactory?: (prefix: string) => string,
): FeedbackRepository {
  return {
    save(feedback: PersistableFeedback) {
      const recordId =
        feedback.recordId ??
        idFactory?.("fb") ??
        `fb_${Date.now().toString(16)}`;

      const record: DbFeedback = {
        id: recordId,
        feedbackId: feedback.feedbackId || parseNumericId(recordId),
        submissionDateISO: feedback.submissionDate.toISOString().slice(0, 10),
        review: feedback.review,
        reason: feedback.reason,
        userId: feedback.userId,
        quoteId: feedback.quoteId,
        createdAtMs: feedback.submissionDate.getTime(),
        context: feedback.context,
        rating:
          feedback.rating >= 1 && feedback.rating <= 5
            ? (feedback.rating as 1 | 2 | 3 | 4 | 5)
            : 3,
        message: feedback.review,
      };

      const existingIndex = db.feedback.findIndex((item) => item.id === recordId);
      if (existingIndex >= 0) {
        db.feedback = db.feedback.map((item) =>
          item.id === recordId ? record : item,
        );
      } else {
        db.feedback = [record, ...db.feedback];
      }

      return record;
    },

    list(filters?: FeedbackReviewFilters) {
      return sortFeedback(
        db.feedback.filter((record) => matchesFilters(record, filters)),
        filters?.sortBy,
      );
    },
  };
}
