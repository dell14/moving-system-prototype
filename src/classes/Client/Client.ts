import type { QuoteInput } from "@/src/mockDb/types";
import { Booking } from "../Booking";
import { Feedback } from "../Feedback";
import { Payment } from "../Payment";
import { Quote } from "../Quote";
import type { FeedbackRepository } from "../shared/types";
import { User } from "../User";

type ClientProps = ConstructorParameters<typeof User>[0] & {
  preferredNotificationChannel: string;
  numberOfServiceRequests: number;
};

type AcceptQuoteInput = {
  bookingId: number;
  bookingRecordId?: string;
  paymentId: number;
  paymentRecordId?: string;
  depositCents: number;
  currency?: string;
  userRecordId: string;
  quoteRecordId: string;
  scheduledSlotId?: string;
  now?: Date;
  requiredDepositCents?: number;
};

export class Client extends User {
  public preferredNotificationChannel: string;
  public numberOfServiceRequests: number;

  constructor(props: ClientProps) {
    super(props);
    this.preferredNotificationChannel = props.preferredNotificationChannel;
    this.numberOfServiceRequests = props.numberOfServiceRequests;
  }

  requestQuote(
    input: QuoteInput,
    options: {
      quoteId: number;
      recordId?: string;
      userRecordId: string;
      requestedAt?: Date;
      expirationDateTime?: Date;
      totalCents?: number;
    },
  ): Quote {
    const quote = Quote.createFromRequest({
      recordId: options.recordId,
      quoteId: options.quoteId,
      userId: options.userRecordId,
      requestedAt: options.requestedAt,
      expirationDateTime: options.expirationDateTime,
      quoteInput: input,
      totalCents: options.totalCents,
    });
    quote.generate();
    this.numberOfServiceRequests += 1;
    return quote;
  }

  acceptQuote(
    quote: Quote,
    input: AcceptQuoteInput,
  ): {
    success: boolean;
    quote: Quote;
    booking?: Booking;
    payment?: Payment;
    message: string;
  } {
    const now = input.now ?? new Date();
    if (!quote.accept(now.getTime())) {
      return {
        success: false,
        quote,
        message: "Quote is not active and cannot be accepted.",
      };
    }

    const payment = new Payment({
      recordId: input.paymentRecordId,
      paymentId: input.paymentId,
      bookingId: input.bookingRecordId ?? "",
      quoteId: input.quoteRecordId,
      userId: input.userRecordId,
      amount: input.depositCents / 100,
      currency: input.currency ?? "USD",
      processedAt: undefined,
      status: "pending",
    });

    if (!payment.processPayment()) {
      return {
        success: false,
        quote,
        payment,
        message: "Deposit payment validation failed.",
      };
    }

    const booking = Booking.createBooking({
      recordId: input.bookingRecordId,
      bookingId: input.bookingId,
      userId: input.userRecordId,
      quoteId: input.quoteRecordId,
      createdAt: now,
      depositRequiredAmount:
        Math.max(input.requiredDepositCents ?? input.depositCents, 0) / 100,
      depositPaidAmount: payment.amount,
      scheduledSlotId: input.scheduledSlotId,
    });

    if (!booking.confirm()) {
      return {
        success: false,
        quote,
        booking,
        payment,
        message: "Booking prerequisites were not satisfied.",
      };
    }

    if (input.bookingRecordId) {
      payment.bookingId = input.bookingRecordId;
    }

    return {
      success: true,
      quote,
      booking,
      payment,
      message: "Booking confirmed successfully.",
    };
  }

  submitFeedback(
    feedbackInput: Feedback | Omit<ConstructorParameters<typeof Feedback>[0], "submissionDate"> & {
      submissionDate?: Date;
    },
    repository?: FeedbackRepository,
  ): Feedback | undefined {
    const feedback =
      feedbackInput instanceof Feedback
        ? feedbackInput
        : new Feedback({
            ...feedbackInput,
            submissionDate: feedbackInput.submissionDate ?? new Date(),
          });
    const didSubmit = feedback.submit(repository);
    return didSubmit ? feedback : undefined;
  }
}
