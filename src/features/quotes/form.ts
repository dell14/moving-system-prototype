import type { QuoteInput } from "@/src/mockDb/types";

export type QuoteFormErrors = {
  fromAddress?: string;
  toAddress?: string;
  moveDateISO?: string;
  moveTime?: string;
  distanceKm?: string;
  itemsCount?: string;
  form?: string;
};

export function validateQuoteInput(input: QuoteInput): QuoteFormErrors {
  const errors: QuoteFormErrors = {};

  if (!input.fromAddress.trim()) errors.fromAddress = "Enter a pickup address.";
  if (!input.toAddress.trim()) errors.toAddress = "Enter a drop-off address.";
  if (!input.moveDateISO.trim()) errors.moveDateISO = "Select a move date.";
  if (!input.moveTime.trim()) errors.moveTime = "Select a move time.";
  if (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0) {
    errors.distanceKm = "Distance must be greater than 0.";
  }
  if (!Number.isFinite(input.itemsCount) || input.itemsCount <= 0) {
    errors.itemsCount = "Items must be greater than 0.";
  }

  return errors;
}
