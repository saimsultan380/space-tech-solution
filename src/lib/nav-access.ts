import type { UserRole } from "@/lib/types";

/** Processor dashboard promo card; cleared after they open Call Logs (browser localStorage). */
export const PROCESSOR_CALL_LOGS_CTA_DISMISSED_KEY = "crm_processor_call_logs_cta_dismissed";

export function hasDismissedProcessorCallLogsDashboardCta(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROCESSOR_CALL_LOGS_CTA_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissProcessorCallLogsDashboardCta(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROCESSOR_CALL_LOGS_CTA_DISMISSED_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

const CALL_LOGS_HREF = "/dashboard/call-logs-responses";
const LEGACY_CUSTOMERS_HREF = "/dashboard/customers";
const PROCESSING_ACCOUNTS_HREF = "/dashboard/processing-accounts";

/** Whether the user may see Call Logs / customers (after sidebar module filtering). */
export function canAccessCallLogsResponses(
  role: UserRole,
  allowedModules: string[] | null | undefined
): boolean {
  if (role === "super_admin") return true;
  const hasModule = (href: string): boolean =>
    Boolean(
      allowedModules?.includes(href) ||
        (href === CALL_LOGS_HREF && allowedModules?.includes(LEGACY_CUSTOMERS_HREF))
    );

  if (role === "sales_agent") {
    if (!allowedModules || allowedModules.length === 0) return true;
    return hasModule(CALL_LOGS_HREF);
  }
  if (role === "processor") {
    if (!allowedModules || allowedModules.length === 0) return false;
    return hasModule(CALL_LOGS_HREF);
  }
  return false;
}

/** Whether the user may see Processing Accounts (after sidebar module filtering). */
export function canAccessProcessingAccounts(
  role: UserRole,
  allowedModules: string[] | null | undefined
): boolean {
  if (role === "super_admin") return true;

  if (role === "sales_agent") {
    if (!allowedModules || allowedModules.length === 0) return true;
    return allowedModules.includes(PROCESSING_ACCOUNTS_HREF);
  }
  if (role === "processor") {
    if (!allowedModules || allowedModules.length === 0) return true;
    return allowedModules.includes(PROCESSING_ACCOUNTS_HREF);
  }
  return false;
}
