/** View-only period for dashboard cards and reports. Does not write any records. */

export type StatsPeriod =
  | { mode: "all" }
  | { mode: "month"; month: string }
  | { mode: "custom"; from: string; to: string };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MAX_RANGE_DAYS = 366;

export function currentMonthValue(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function recentMonthOptions(count = 18, now = new Date()) {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

/** Inclusive calendar bounds for a YYYY-MM month. */
export function monthBounds(month: string): { from: string; to: string } | null {
  if (!MONTH_RE.test(month)) return null;
  const [year, mon] = month.split("-").map(Number);
  const last = new Date(year, mon, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

export function customRangeError(from: string, to: string): string | null {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return "Choose a valid start and end date.";
  }
  if (from > to) return "Start date must be on or before the end date.";
  const start = Date.parse(`${from}T00:00:00`);
  const end = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return "Choose a valid start and end date.";
  const days = Math.round((end - start) / 86_400_000);
  if (days > MAX_RANGE_DAYS) return "Custom range can be at most 366 days.";
  return null;
}

/** Inclusive dates sent to range RPCs. Null means all-time (no date predicate). */
export function periodRange(period: StatsPeriod): { from: string; to: string } | null {
  if (period.mode === "all") return null;
  if (period.mode === "month") return monthBounds(period.month);
  if (customRangeError(period.from, period.to)) return null;
  return { from: period.from, to: period.to };
}

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function periodLabel(period: StatsPeriod): string {
  if (period.mode === "all") return "All time";
  if (period.mode === "month") {
    const bounds = monthBounds(period.month);
    if (!bounds) return period.month;
    const [y, m] = period.month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  return `${formatDay(period.from)} – ${formatDay(period.to)}`;
}
