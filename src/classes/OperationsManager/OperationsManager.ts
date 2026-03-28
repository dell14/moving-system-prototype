import type { Feedback as DbFeedback } from "@/src/mockDb/types";
import type { FeedbackRepository, FeedbackReviewFilters } from "../shared/types";
import type {
  InventoryManagementResult,
  InventoryRepository,
  ScheduleAssignmentResult,
} from "../shared/types";
import { Feedback } from "../Feedback";
import { InventoryItem } from "../InventoryItem";
import { ServiceSlot } from "../ServiceSlot";
import { User } from "../User";
import { Booking } from "../Booking";
import { uniqueNonEmpty } from "../shared/utils";

type OperationsManagerProps = ConstructorParameters<typeof User>[0] & {
  managerPermissions: boolean;
  salary: number;
};

export class OperationsManager extends User {
  public managerPermissions: boolean;
  public salary: number;

  constructor(props: OperationsManagerProps) {
    super(props);
    this.managerPermissions = props.managerPermissions;
    this.salary = props.salary;
  }

  scheduleEmployees(input: {
    booking: Booking;
    slot?: ServiceSlot;
    availableEmployeeNames: string[];
    requestedCrewSize?: number;
  }): ScheduleAssignmentResult {
    const requestedCrewSize = Math.max(
      1,
      Math.trunc(input.requestedCrewSize ?? 2),
    );

    if (!this.managerPermissions || !input.booking.isSchedulable()) {
      return {
        success: false,
        bookingId: input.booking.bookingId,
        slotId: input.slot?.slotId,
        assignedEmployeeNames: [],
        note: "Booking is not schedulable.",
      };
    }

    if (input.slot && !input.slot.confirmAvailability() && !input.booking.scheduledSlotId) {
      return {
        success: false,
        bookingId: input.booking.bookingId,
        slotId: input.slot.slotId,
        assignedEmployeeNames: [],
        note: "The selected slot is not available.",
      };
    }

    const crew = uniqueNonEmpty(input.availableEmployeeNames).slice(
      0,
      requestedCrewSize,
    );

    if (crew.length === 0) {
      input.booking.assignEmployees(
        [],
        "No available employees matched this booking.",
      );
      return {
        success: false,
        bookingId: input.booking.bookingId,
        slotId: input.slot?.slotId,
        assignedEmployeeNames: [],
        note: "No available employees matched this booking.",
      };
    }

    if (input.slot?.recordId && !input.booking.scheduledSlotId) {
      input.booking.scheduledSlotId = input.slot.recordId;
    }

    const note = `Assigned ${crew.join(", ")} to this booking.`;
    input.booking.assignEmployees(crew, note);

    return {
      success: true,
      bookingId: input.booking.bookingId,
      slotId: input.slot?.slotId,
      assignedEmployeeNames: crew,
      note,
    };
  }

  manageInventory(input: {
    action: "check" | "add" | "remove";
    item: InventoryItem;
    amount?: number;
    minimumQuantity?: number;
    repository?: InventoryRepository;
  }): InventoryManagementResult {
    if (input.action === "add") {
      input.item.addItem(input.amount ?? 0);
      input.item.saveChanges(input.repository);
    } else if (input.action === "remove") {
      input.item.removeItem(input.amount ?? 0);
      input.item.saveChanges(input.repository);
    }

    const summary = input.item.checkInventory({
      minimumQuantity: input.minimumQuantity,
    });

    return {
      success: true,
      action: input.action,
      message: summary.message,
      summary,
    };
  }

  reviewFeedback(
    source: FeedbackRepository,
    filters?: FeedbackReviewFilters,
  ): DbFeedback[];
  reviewFeedback(
    source: Feedback[],
    filters?: FeedbackReviewFilters,
  ): Feedback[];
  reviewFeedback(
    source: Feedback[] | FeedbackRepository,
    filters?: FeedbackReviewFilters,
  ) {
    if (!this.managerPermissions) {
      return Array.isArray(source) ? [] : [];
    }

    if (Array.isArray(source)) {
      return Feedback.filterRecords(source, filters);
    }

    return Feedback.retrieve(source, filters);
  }
}
