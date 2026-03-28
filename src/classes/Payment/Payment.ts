import type { PaymentStatus } from "../shared/types";

type PaymentProps = {
  recordId?: string;
  paymentId: number;
  bookingId: string;
  quoteId: string;
  userId: string;
  amount: number;
  currency: string;
  processedAt?: Date;
  status: PaymentStatus;
};

export class Payment {
  public recordId?: string;
  public paymentId: number;
  public bookingId: string;
  public quoteId: string;
  public userId: string;
  public amount: number;
  public currency: string;
  public processedAt?: Date;
  public status: PaymentStatus;

  constructor(props: PaymentProps) {
    this.recordId = props.recordId;
    this.paymentId = props.paymentId;
    this.bookingId = props.bookingId;
    this.quoteId = props.quoteId;
    this.userId = props.userId;
    this.amount = props.amount;
    this.currency = props.currency.trim().toUpperCase();
    this.processedAt = props.processedAt;
    this.status = props.status;
  }

  validatePayment(): boolean {
    const hasReferences =
      this.bookingId.trim().length > 0 &&
      this.quoteId.trim().length > 0 &&
      this.userId.trim().length > 0;
    const hasCurrency = /^[A-Z]{3}$/.test(this.currency);
    return this.amount > 0 && hasCurrency && hasReferences;
  }

  processPayment(): boolean {
    if (!this.validatePayment()) {
      this.status = "failed";
      return false;
    }
    this.status = "processed";
    this.processedAt = new Date();
    return true;
  }

  refund(): boolean {
    if (this.status !== "processed") return false;
    this.status = "refunded";
    this.processedAt = new Date();
    return true;
  }
}
