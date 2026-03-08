import type { Booking, Feedback, Quote, User } from "@/src/mockDb/types";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMsFromIso(iso: string | undefined, fallback: number): number {
  if (!iso) return fallback;
  const parsed = new Date(iso).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFirstNumber(input: string): number {
  const parsed = Number.parseFloat(input.replace(/[^\d.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getUserDisplayName(user: Pick<User, "name" | "firstName" | "lastName">): string {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.name;
}

export function getUserPasswordHashOrLegacy(
  user: Pick<User, "passwordHash" | "password">,
): string {
  return user.passwordHash || user.password;
}

export function getQuoteExpiresAtMs(quote: Quote): number {
  return quote.expiresAtMs || toMsFromIso(quote.expirationDateTimeISO, Date.now());
}

export function getQuoteTotalCents(quote: Quote): number {
  return quote.totalCents || Math.round((quote.totalCost || 0) * 100);
}

export function getQuoteFromAddress(quote: Quote): string {
  return quote.startAddress || quote.input.fromAddress;
}

export function getQuoteToAddress(quote: Quote): string {
  return quote.endAddress || quote.input.toAddress;
}

export function getQuoteMoveDateISO(quote: Quote): string {
  return quote.input.moveDateISO || quote.requestedDateTimeISO.slice(0, 10);
}

export function getQuoteMoveTime(quote: Quote): string {
  return quote.input.moveTime || "10:00";
}

export function getQuoteDistanceKm(quote: Quote): number {
  const fromInput = toNumber(quote.input.distanceKm, 0);
  if (fromInput > 0) return fromInput;
  return parseFirstNumber(quote.distance);
}

export function getQuoteItemsCount(quote: Quote): number {
  const fromInput = toNumber(quote.input.itemsCount, 0);
  if (fromInput > 0) return fromInput;
  return toNumber(quote.apartmentSize.replace(/\D+/g, ""), 0);
}

export function getBookingDepositCents(booking: Booking): number {
  return booking.depositPaidAmountCents || booking.depositCents;
}

export function getBookingPaidAtMs(booking: Booking): number {
  return booking.confirmedAtMs || booking.createdAtMs;
}

export function getFeedbackSubmittedAtMs(feedback: Feedback): number {
  return feedback.createdAtMs || toMsFromIso(feedback.submissionDateISO, Date.now());
}

export function getFeedbackMessage(feedback: Feedback): string {
  return feedback.review || feedback.message;
}
