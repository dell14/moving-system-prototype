import type { Feedback as DbFeedback } from "@/src/mockDb/types";
import type {
  FeedbackRepository,
  FeedbackReviewFilters,
  PersistableFeedback,
} from "../shared/types";

type FeedbackProps = {
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

export class Feedback {
  public recordId?: string;
  public feedbackId: number;
  public userId?: string;
  public quoteId?: string;
  public submissionDate: Date;
  public rating: number;
  public review: string;
  public reason: string;
  public context: DbFeedback["context"];

  constructor(props: FeedbackProps) {
    this.recordId = props.recordId;
    this.feedbackId = props.feedbackId;
    this.userId = props.userId;
    this.quoteId = props.quoteId;
    this.submissionDate = props.submissionDate;
    this.rating = props.rating;
    this.review = props.review;
    this.reason = props.reason;
    this.context = props.context;
  }

  validate(): boolean {
    return (
      this.review.trim().length > 0 &&
      Number.isFinite(this.rating) &&
      this.rating >= 1 &&
      this.rating <= 5
    );
  }

  submit(repository?: FeedbackRepository): boolean {
    if (!this.validate()) return false;
    this.submissionDate = new Date();
    if (repository) {
      repository.save(this.toPersistence());
    }
    return true;
  }

  toPersistence(): PersistableFeedback {
    return {
      recordId: this.recordId,
      feedbackId: this.feedbackId,
      userId: this.userId,
      quoteId: this.quoteId,
      submissionDate: this.submissionDate,
      rating: this.rating,
      review: this.review,
      reason: this.reason,
      context: this.context,
    };
  }

  static retrieve(
    repository: FeedbackRepository,
    filters?: FeedbackReviewFilters,
  ): DbFeedback[] {
    return repository.list(filters);
  }

  static filterRecords(
    records: Feedback[],
    filters?: FeedbackReviewFilters,
  ): Feedback[] {
    const filtered = records.filter((record) => {
      if (filters?.context && record.context !== filters.context) return false;
      if (filters?.userId && record.userId !== filters.userId) return false;
      if (filters?.quoteId && record.quoteId !== filters.quoteId) return false;
      if (
        filters?.ratingAtLeast !== undefined &&
        record.rating < filters.ratingAtLeast
      ) {
        return false;
      }
      if (
        filters?.ratingAtMost !== undefined &&
        record.rating > filters.ratingAtMost
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (filters?.sortBy === "oldest") {
      sorted.sort(
        (a, b) => a.submissionDate.getTime() - b.submissionDate.getTime(),
      );
      return sorted;
    }
    if (filters?.sortBy === "rating_asc") {
      sorted.sort((a, b) => a.rating - b.rating);
      return sorted;
    }
    if (filters?.sortBy === "rating_desc") {
      sorted.sort((a, b) => b.rating - a.rating);
      return sorted;
    }
    sorted.sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime());
    return sorted;
  }
}
