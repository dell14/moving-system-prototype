import type { QuoteInput } from "@/src/mockDb/types";
import { DomainValidationError } from "../shared/errors";
import { DAY_MS, parseNumericId } from "../shared/utils";
import type { QuoteStatus } from "../shared/types";
import { ServiceSlot } from "../ServiceSlot";

type QuoteProps = {
  recordId?: string;
  quoteId: number;
  userId: string;
  requestedDateTime: Date;
  moveDateISO: string;
  moveTime: string;
  startAddress: string;
  endAddress: string;
  distanceKm: number;
  itemsCount: number;
  hasPacking: boolean;
  hasStorage: boolean;
  qtyResidents: number;
  serviceOption: string;
  expirationDateTime: Date;
  status: QuoteStatus;
  totalCost: number;
  heldSlotId?: string;
};

export class Quote {
  public recordId?: string;
  public quoteId: number;
  public userId: string;
  public requestedDateTime: Date;
  public moveDateISO: string;
  public moveTime: string;
  public startAddress: string;
  public endAddress: string;
  public distanceKm: number;
  public itemsCount: number;
  public hasPacking: boolean;
  public hasStorage: boolean;
  public qtyResidents: number;
  public serviceOption: string;
  public expirationDateTime: Date;
  public status: QuoteStatus;
  public totalCost: number;
  public heldSlotId?: string;

  constructor(props: QuoteProps) {
    this.recordId = props.recordId;
    this.quoteId = props.quoteId;
    this.userId = props.userId;
    this.requestedDateTime = props.requestedDateTime;
    this.moveDateISO = props.moveDateISO;
    this.moveTime = props.moveTime;
    this.startAddress = props.startAddress;
    this.endAddress = props.endAddress;
    this.distanceKm = props.distanceKm;
    this.itemsCount = props.itemsCount;
    this.hasPacking = props.hasPacking;
    this.hasStorage = props.hasStorage;
    this.qtyResidents = props.qtyResidents;
    this.serviceOption = props.serviceOption;
    this.expirationDateTime = props.expirationDateTime;
    this.status = props.status;
    this.totalCost = props.totalCost;
    this.heldSlotId = props.heldSlotId;
  }

  static estimateTotalCents(input: {
    distanceKm: number;
    itemsCount: number;
    hasPacking: boolean;
    hasStorage: boolean;
  }): number {
    const base = 7500;
    const perKm = Math.round(input.distanceKm * 150);
    const perItem = input.itemsCount * 200;
    const packing = input.hasPacking ? 5000 : 0;
    const storage = input.hasStorage ? 2500 : 0;
    return base + perKm + perItem + packing + storage;
  }

  static createFromRequest(input: {
    recordId?: string;
    quoteId: number;
    userId: string;
    requestedAt?: Date;
    expirationDateTime?: Date;
    quoteInput: QuoteInput;
    totalCents?: number;
  }): Quote {
    const requestedAt = input.requestedAt ?? new Date();
    const totalCents =
      input.totalCents ?? Quote.estimateTotalCents(input.quoteInput);

    return new Quote({
      recordId: input.recordId,
      quoteId: input.quoteId || parseNumericId(input.recordId),
      userId: input.userId,
      requestedDateTime: requestedAt,
      moveDateISO: input.quoteInput.moveDateISO,
      moveTime: input.quoteInput.moveTime,
      startAddress: input.quoteInput.fromAddress,
      endAddress: input.quoteInput.toAddress,
      distanceKm: input.quoteInput.distanceKm,
      itemsCount: input.quoteInput.itemsCount,
      hasPacking: input.quoteInput.hasPacking,
      hasStorage: input.quoteInput.hasStorage,
      qtyResidents: Math.max(
        1,
        Math.ceil(input.quoteInput.itemsCount / 15),
      ),
      serviceOption:
        input.quoteInput.hasPacking || input.quoteInput.hasStorage
          ? [
              input.quoteInput.hasPacking ? "packing" : "",
              input.quoteInput.hasStorage ? "storage" : "",
            ]
              .filter(Boolean)
              .join("+")
          : "move_only",
      expirationDateTime:
        input.expirationDateTime ??
        new Date(requestedAt.getTime() + DAY_MS),
      status: "active",
      totalCost: totalCents / 100,
    });
  }

  get input(): QuoteInput {
    return {
      fromAddress: this.startAddress,
      toAddress: this.endAddress,
      moveDateISO: this.moveDateISO,
      moveTime: this.moveTime,
      distanceKm: this.distanceKm,
      itemsCount: this.itemsCount,
      hasPacking: this.hasPacking,
      hasStorage: this.hasStorage,
    };
  }

  get distanceLabel(): string {
    return `${this.distanceKm}km`;
  }

  get apartmentSizeLabel(): string {
    return `${this.itemsCount} items`;
  }

  validate(): boolean {
    try {
      this.assertValid();
      return true;
    } catch {
      return false;
    }
  }

  validateForm(): boolean {
    return this.validate();
  }

  generate(): boolean {
    if (!Number.isFinite(this.totalCost) || this.totalCost <= 0) {
      this.totalCost = Quote.estimateTotalCents(this.input) / 100;
    }
    if (!this.serviceOption.trim()) {
      this.serviceOption =
        this.hasPacking || this.hasStorage
          ? [
              this.hasPacking ? "packing" : "",
              this.hasStorage ? "storage" : "",
            ]
              .filter(Boolean)
              .join("+")
          : "move_only";
    }
    if (!Number.isFinite(this.qtyResidents) || this.qtyResidents < 1) {
      this.qtyResidents = Math.max(1, Math.ceil(this.itemsCount / 15));
    }
    if (
      !Number.isFinite(this.expirationDateTime.getTime()) ||
      this.expirationDateTime.getTime() <= this.requestedDateTime.getTime()
    ) {
      this.expirationDateTime = new Date(
        this.requestedDateTime.getTime() + DAY_MS,
      );
    }
    this.assertValid();
    this.status = "active";
    return true;
  }

  expire(nowMs = Date.now()): boolean {
    if (this.status !== "active") return false;
    if (nowMs < this.expirationDateTime.getTime()) return false;
    this.status = "expired";
    return true;
  }

  accept(nowMs = Date.now()): boolean {
    this.expire(nowMs);
    if (this.status !== "active") return false;
    this.status = "accepted";
    return true;
  }

  decline(): boolean {
    if (this.status !== "active") return false;
    this.status = "declined";
    return true;
  }

  denied(): void {
    this.decline();
  }

  getAvailability(slots: ServiceSlot[] = []): ServiceSlot[] {
    return slots.filter((slot) => {
      const slotDateIso = slot.date.toISOString().slice(0, 10);
      return slotDateIso === this.moveDateISO && slot.confirmAvailability();
    });
  }

  getClientContact(): void {}

  private assertValid(): void {
    if (!this.startAddress.trim()) {
      throw new DomainValidationError("A start address is required.");
    }
    if (!this.endAddress.trim()) {
      throw new DomainValidationError("An end address is required.");
    }
    if (this.startAddress.trim() === this.endAddress.trim()) {
      throw new DomainValidationError(
        "Start and end addresses must be different.",
      );
    }
    if (!Number.isFinite(this.distanceKm) || this.distanceKm <= 0) {
      throw new DomainValidationError("Distance must be greater than zero.");
    }
    if (!Number.isFinite(this.itemsCount) || this.itemsCount <= 0) {
      throw new DomainValidationError("Items count must be greater than zero.");
    }
    const requestedMoveMs = new Date(
      `${this.moveDateISO}T${this.moveTime || "00:00"}:00`,
    ).getTime();
    if (!Number.isFinite(requestedMoveMs)) {
      throw new DomainValidationError("Move date and time are invalid.");
    }
    if (!Number.isFinite(this.requestedDateTime.getTime())) {
      throw new DomainValidationError("Requested date is invalid.");
    }
    if (!Number.isFinite(this.expirationDateTime.getTime())) {
      throw new DomainValidationError("Expiration date is invalid.");
    }
    if (this.expirationDateTime.getTime() <= this.requestedDateTime.getTime()) {
      throw new DomainValidationError(
        "Expiration date must be after the request date.",
      );
    }
    if (!Number.isFinite(this.totalCost) || this.totalCost <= 0) {
      throw new DomainValidationError("Quote total must be greater than zero.");
    }
  }
}
