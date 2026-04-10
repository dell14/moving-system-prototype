import type { Feedback as DbFeedback } from "@/src/mockDb/types";
import type {
  FeedbackRepository,
  PersistableFeedback,
} from "../shared/types";

export class FeedbackStorage implements FeedbackRepository {
  constructor(private repository?: FeedbackRepository) {}

  save(feedback: PersistableFeedback): DbFeedback {
    if (!this.repository) {
      throw new Error("Feedback storage repository is not configured.");
    }
    return this.repository.save(feedback);
  }

  list(filters?: Parameters<FeedbackRepository["list"]>[0]): DbFeedback[] {
    return this.repository?.list(filters) ?? [];
  }

  storeFeedback(feedback: PersistableFeedback): void {
    this.save(feedback);
  }

  showError(message: string): void {
    void message;
  }
}
