import type { DayOfWeek, Shift } from "@/src/mockDb/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function parseNumericId(rawId: unknown): number {
  const asString = String(rawId ?? "");
  const digits = asString.replace(/\D+/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits.slice(0, 9), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function splitName(
  fullName: unknown,
): { firstName: string; lastName: string } {
  const trimmed = String(fullName ?? "").trim();
  if (!trimmed) {
    return { firstName: "Unknown", lastName: "User" };
  }
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || "User",
  };
}

export function joinName(firstName: unknown, lastName: unknown): string {
  return `${String(firstName ?? "").trim()} ${String(lastName ?? "").trim()}`
    .trim();
}

export function usernameFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

export function ensureDate(
  value: Date | string | number | undefined,
  fallback = new Date(),
): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : new Date(fallback.getTime());
  if (!Number.isFinite(parsed.getTime())) {
    return new Date(fallback.getTime());
  }
  return parsed;
}

export function parseTimeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return -1;
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return -1;
  }
  return hour * 60 + minute;
}

export function addHoursToTime(time: string, hours: number): string {
  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes < 0) return time;
  const totalMinutes = startMinutes + hours * 60;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const nextMinute = (normalized % 60).toString().padStart(2, "0");
  return `${nextHour}:${nextMinute}`;
}

export function getDayOfWeek(dateISO: string): DayOfWeek {
  const date = new Date(`${dateISO}T00:00:00`);
  const labels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ] as const;
  return labels[date.getDay()] ?? "Monday";
}

export function shiftToWindow(
  shift: Shift,
): { startTime: string; endTime: string } {
  if (shift === "morning") return { startTime: "08:00", endTime: "12:00" };
  if (shift === "evening") return { startTime: "13:00", endTime: "17:00" };
  return { startTime: "09:00", endTime: "17:00" };
}

export function normalizeInventoryName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeInventoryUnit(unit?: string): string {
  return unit?.trim().toLowerCase() ?? "";
}

export function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeQuoteStatus(
  value: string,
): "active" | "expired" | "accepted" | "declined" {
  if (value === "expired" || value === "accepted" || value === "declined") {
    return value;
  }
  return "active";
}

export function normalizeFeedbackContext(
  value: string,
): "post_service" | "declined_quote" | "expired_quote" {
  if (value === "declined_quote" || value === "expired_quote") {
    return value;
  }
  return "post_service";
}
