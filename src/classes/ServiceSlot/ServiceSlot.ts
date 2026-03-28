import { DomainValidationError } from "../shared/errors";
import { parseTimeToMinutes } from "../shared/utils";

type ServiceSlotProps = {
  recordId?: string;
  slotId: number;
  availabilityId?: number;
  date: Date;
  startTime: string;
  endTime: string;
  status: "available" | "held" | "reserved";
  heldByQuoteId?: string;
};

export class ServiceSlot {
  public recordId?: string;
  public slotId: number;
  public availabilityId?: number;
  public date: Date;
  public startTime: string;
  public endTime: string;
  public status: "available" | "held" | "reserved";
  public heldByQuoteId?: string;

  constructor(props: ServiceSlotProps) {
    this.recordId = props.recordId;
    this.slotId = props.slotId;
    this.availabilityId = props.availabilityId;
    this.date = props.date;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.status = props.status;
    this.heldByQuoteId = props.heldByQuoteId;
  }

  validateAvailability(): boolean {
    const startMinutes = parseTimeToMinutes(this.startTime);
    const endMinutes = parseTimeToMinutes(this.endTime);
    if (
      !Number.isFinite(this.date.getTime()) ||
      startMinutes < 0 ||
      endMinutes < 0 ||
      startMinutes >= endMinutes
    ) {
      throw new DomainValidationError("Invalid service slot window.");
    }
    return true;
  }

  confirmAvailability(): boolean {
    try {
      this.validateAvailability();
    } catch {
      return false;
    }
    return this.status === "available";
  }

  reserve(heldByQuoteId?: string): boolean {
    if (!this.confirmAvailability()) return false;
    this.status = "reserved";
    if (heldByQuoteId) {
      this.heldByQuoteId = heldByQuoteId;
    }
    return true;
  }
}
