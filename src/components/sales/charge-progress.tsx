import { cn, formatInAppZone } from "@/lib/utils";
import type { ChargeRequestStatus } from "@/lib/types";

const FLOW = ["pending", "viewed", "charging", "approved"] as const;

const LABEL: Record<ChargeRequestStatus, string> = {
  pending: "Pending",
  viewed: "Viewed",
  charging: "Charging",
  approved: "Approved",
  declined: "Declined",
};

function appTime(value: string | null | undefined) {
  if (!value) return null;
  return formatInAppZone(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stepState(step: (typeof FLOW)[number], status: ChargeRequestStatus) {
  if (status === "declined") {
    return step === "approved" ? "failed" : "complete";
  }
  const current = FLOW.indexOf(status as (typeof FLOW)[number]);
  const index = FLOW.indexOf(step);
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

export function ChargeStatusPill({
  status,
  viewedAt,
  declineReason,
  remarks,
}: {
  status: ChargeRequestStatus;
  viewedAt?: string | null;
  declineReason?: string | null;
  remarks?: string | null;
}) {
  const viewed = appTime(viewedAt);
  const detail =
    status === "pending"
      ? "Not opened"
      : status === "viewed"
        ? viewed
          ? `Opened ${viewed}`
          : "Opened"
        : status === "charging"
          ? "Card is being charged"
          : status === "approved"
            ? remarks || "Merchant approved"
            : remarks || declineReason || "Merchant declined";

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
          status === "approved" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          status === "declined" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
          status === "charging" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
          status === "viewed" && "bg-sky-500/15 text-sky-800 dark:text-sky-300",
          status === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {LABEL[status]}
      </span>
      <span className="max-w-[150px] truncate text-[10px] text-muted-foreground">{detail}</span>
    </div>
  );
}

export function ChargeProgress({
  status,
  merchantName,
  viewedAt,
  declineReason,
  remarks,
}: {
  status: ChargeRequestStatus;
  merchantName?: string | null;
  viewedAt?: string | null;
  declineReason?: string | null;
  remarks?: string | null;
}) {
  const viewed = appTime(viewedAt);
  const summary =
    status === "pending"
      ? "Waiting for the merchant to open this request."
      : status === "viewed"
        ? viewed
          ? `Opened ${viewed}.`
          : "The merchant opened this request."
        : status === "charging"
          ? "The card is being charged now."
          : status === "approved"
            ? remarks
              ? `Approved. ${remarks}`
              : "Approved. The sale details were added."
            : remarks || declineReason
              ? `Declined: ${remarks || declineReason}`
              : "The merchant declined this charge.";

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Merchant approval</p>
        <ChargeStatusPill status={status} viewedAt={viewedAt} declineReason={declineReason} remarks={remarks} />
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-2">
        {FLOW.map((step) => {
          const state = stepState(step, status);
          const label = state === "failed" ? "Declined" : LABEL[step];
          return (
            <li key={step} className="min-w-0">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  (state === "complete" || (state === "current" && status === "approved")) && "bg-emerald-500",
                  state === "current" && status === "charging" && "bg-amber-500",
                  state === "current" && status !== "charging" && status !== "approved" && "bg-sky-500",
                  state === "failed" && "bg-rose-500",
                  state === "upcoming" && "bg-muted",
                )}
              />
              <p
                className={cn(
                  "mt-1 truncate text-[11px] font-medium",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  state === "failed" && "text-rose-600 dark:text-rose-400",
                )}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground">
        {merchantName ? `${merchantName}. ` : ""}
        {summary}
      </p>
    </div>
  );
}
