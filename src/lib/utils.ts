import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { APP_TIMEZONE, DEFAULT_CURRENCY } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const safe = Number(amount ?? 0);
  const curr = currency || DEFAULT_CURRENCY;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: curr,
  }).format(Number.isFinite(safe) ? safe : 0);
}

function isCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatInAppZone(
  date: string | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  if (typeof date === "string" && isCalendarDate(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: APP_TIMEZONE,
  }).format(new Date(date));
}

export function formatDate(date: string | Date): string {
  return formatInAppZone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return formatInAppZone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCnic(value: string | null | undefined): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Escape user input for use inside PostgREST `.or()` / `.ilike()` filter strings.
 * Prevents filter injection via commas, parentheses, and SQL LIKE wildcards.
 */
export function sanitizeFilterValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");
}
