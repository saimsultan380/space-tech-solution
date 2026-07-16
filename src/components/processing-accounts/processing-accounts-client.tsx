"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableDataExport } from "@/components/ui/table-data-export";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProcessingAccountFormDialog } from "./processing-account-form-dialog";
import { ProcessingAccountsImportDialog } from "./processing-accounts-import-dialog";
import { DeleteProcessingAccountButton } from "./delete-processing-account-button";
import { NotifyAdminDialog } from "./notify-admin-dialog";
import { PROCESSING_ACCOUNT_STATUSES } from "@/lib/constants";
import type { UserRole, ProcessingAccountStatus } from "@/lib/types";
import {
  updateProcessingAccountNotes,
  updateProcessingAccountStatus,
  getProcessingAccounts,
  getProcessingAccountStats,
} from "@/lib/actions/processing-accounts";
import type { ProcessingAccountStats } from "@/lib/actions/processing-accounts";
import {
  Plus,
  FileUp,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Clock,
  Pencil,
  Building2,
  CreditCard,
  Eye,
  StickyNote,
  Save,
  ChevronDown,
} from "@/components/ui/icons";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { formatDate } from "@/lib/utils";
import {
  DropdownRangeDatePicker,
  toDateRangeFromFilters,
  toFilterDates,
} from "@/components/ui/dropdown-range-date-picker";

interface ProcessingAccountRow {
  id: string;
  account_type: string;
  account_holder_name: string | null;
  routing_number: string;
  account_number: string;
  card_number: string;
  expiration_date: string;
  cvv: string;
  billing_address: string | null;
  status: ProcessingAccountStatus | null;
  notes: string | null;
  created_at: string | unknown;
  [key: string]: unknown;
}

interface ProcessingAccountsClientProps {
  userRole: UserRole;
}

/** Full card/CVV in Processing Database for super_admin + processor only (not sales). */
function canViewProcessingCardSecrets(role: UserRole): boolean {
  return role === "super_admin" || role === "processor";
}

function formatProcessingCardNumber(
  cardNumber: string | null | undefined,
  role: UserRole
): string {
  const value = cardNumber?.trim() || "";
  if (!value) return "—";
  if (canViewProcessingCardSecrets(role)) return value;
  return `****${value.slice(-4)}`;
}

function formatProcessingCvv(
  cvv: string | null | undefined,
  role: UserRole
): string {
  const value = cvv?.trim() || "";
  if (!canViewProcessingCardSecrets(role)) return "—";
  return value || "—";
}

const statusConfig: Record<
  ProcessingAccountStatus,
  {
    label: string;
    variant: "success" | "destructive" | "warning" | "secondary" | "default";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  active: { label: "Active", variant: "success", icon: CheckCircle },
  not_working: {
    label: "Not Working",
    variant: "destructive",
    icon: AlertTriangle,
  },
  closed: { label: "Closed", variant: "secondary", icon: XCircle },
  reversal_issue: {
    label: "Reversal Issue",
    variant: "warning",
    icon: AlertOctagon,
  },
  under_review: { label: "Under Review", variant: "default", icon: Clock },
};

// ─── Status color map for inline dropdown badge ───────────────────────────────
const statusColors: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  active: {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/40",
    dot: "bg-emerald-500",
  },
  not_working: {
    bg: "bg-red-500/15 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/40",
    dot: "bg-red-500",
  },
  closed: {
    bg: "bg-slate-500/15 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/40",
    dot: "bg-slate-500",
  },
  reversal_issue: {
    bg: "bg-amber-500/15 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
  },
  under_review: {
    bg: "bg-blue-500/15 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/40",
    dot: "bg-blue-500",
  },
};

// ─── Inline Status Dropdown ───────────────────────────────────────────────────
function StatusDropdown({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: ProcessingAccountStatus | null;
  onStatusChange: (status: ProcessingAccountStatus | null) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (value: ProcessingAccountStatus | "") => {
    setOpen(false);
    const newStatus = value || null;
    setSaving(true);
    try {
      await onStatusChange(newStatus as ProcessingAccountStatus | null);
    } catch (error) {
      console.error("Failed to update processing account status", error);
    } finally {
      setSaving(false);
    }
  };

  const current = currentStatus ? statusConfig[currentStatus] : null;
  const colors = currentStatus ? statusColors[currentStatus] : null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer hover:opacity-80 active:scale-95 whitespace-nowrap",
          saving && "opacity-50 cursor-wait",
          colors
            ? cn(colors.bg, colors.text, colors.border)
            : "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 hover:text-primary bg-transparent",
        )}
        title="Click to change status"
      >
        {saving ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : colors ? (
          <span className={cn("h-2 w-2 rounded-full shrink-0", colors.dot)} />
        ) : null}
        <span>{current?.label ?? "Set status"}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          <div className="p-1">
            {PROCESSING_ACCOUNT_STATUSES.map(({ value, label }) => {
              const cfg = statusConfig[value as ProcessingAccountStatus];
              const c = statusColors[value];
              const Icon = cfg?.icon;
              const isSelected = currentStatus === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(value as ProcessingAccountStatus)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left",
                    isSelected
                      ? cn(c.bg, c.text, "font-bold")
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", c.dot)}
                  />
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected ? c.text : "text-muted-foreground",
                      )}
                    />
                  )}
                  {label}
                  {isSelected && (
                    <span className={cn("ml-auto text-xs", c.text)}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1">
            <button
              onClick={() => handleSelect("")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              Clear status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountDetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium text-foreground break-all",
          mono && "font-mono",
        )}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

// ─── View Account Dialog ──────────────────────────────────────────────────────
function ViewAccountDialog({
  account,
  userRole,
  onClose,
}: {
  account: ProcessingAccountRow | null;
  userRole: UserRole;
  onClose: () => void;
}) {
  if (!account) return null;
  const isCard = account.account_type === "card";
  const status = account.status ? statusConfig[account.status] : null;
  const StatusIcon = status?.icon;

  return (
    <Dialog open onClose={onClose} className="max-w-xl">
      <DialogHeader className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {(account.account_holder_name?.trim() || "?")
              .split(/\s+/)
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </div>
          <div>
            <DialogTitle>
              {account.account_holder_name || "Account Details"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isCard ? "Credit / Debit Card" : "CheckIn Account"} ·{" "}
              {formatDate(String(account.created_at || ""))}
            </p>
          </div>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AccountDetailRow
          label="Account Type"
          value={isCard ? "Credit / Debit Card" : "CheckIn Account"}
        />
        <AccountDetailRow
          label="Status"
          value={
            status && StatusIcon ? (
              <Badge variant={status.variant} className="gap-1 text-xs">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            ) : null
          }
        />
        {isCard ? (
          <>
            <AccountDetailRow
              label="Card Number"
              value={formatProcessingCardNumber(account.card_number, userRole)}
              mono
            />
            <AccountDetailRow
              label="Expiry Date"
              value={account.expiration_date}
              mono
            />
            <AccountDetailRow
              label="CVV"
              value={formatProcessingCvv(account.cvv, userRole)}
              mono
            />
          </>
        ) : (
          <>
            <AccountDetailRow
              label="Routing Number"
              value={account.routing_number}
              mono
            />
            <AccountDetailRow
              label="Account Number"
              value={account.account_number}
              mono
            />
          </>
        )}
        <div className="sm:col-span-2">
          <AccountDetailRow label="Billing Address" value={account.billing_address} />
        </div>
        <div className="sm:col-span-2">
          <AccountDetailRow
            label="Notes"
            value={
              account.notes || (
                <span className="text-muted-foreground italic">
                  No notes added
                </span>
              )
            }
          />
        </div>
        <AccountDetailRow
          label="Created On"
          value={formatDate(String(account.created_at || ""))}
        />
      </div>
    </Dialog>
  );
}

// ─── Notes Popover ────────────────────────────────────────────────────────────
function NotesPopover({
  accountId,
  initialNotes,
}: {
  accountId: string;
  initialNotes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProcessingAccountNotes(accountId, notes);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 800);
    } catch {
      // silently fail – server will show error on refresh
    } finally {
      setSaving(false);
    }
  };

  const hasNotes = (initialNotes || "").trim().length > 0;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 min-w-[88px] items-center justify-between gap-1 rounded-md px-2.5 text-xs font-medium transition-colors whitespace-nowrap",
          hasNotes
            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"
            : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        title={hasNotes ? "View / Edit Notes" : "Add Notes"}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" />
        <span>{hasNotes ? "Notes" : "Add Note"}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-border bg-popover p-3 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Notes
          </p>
          <textarea
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={4}
            placeholder="Add notes here…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || saved}
              className="h-7 text-xs gap-1"
            >
              <Save className="h-3 w-3" />
              {saved ? "Saved!" : saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProcessingAccountsClient({
  userRole,
}: ProcessingAccountsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<ProcessingAccountRow | null>(null);
  const [viewingAccount, setViewingAccount] =
    useState<ProcessingAccountRow | null>(null);
  const [notifyAccountId, setNotifyAccountId] = useState<string | null>(null);

  const page = Number(searchParams.get("page")) || 1;
  const statusFilter = searchParams.get("status") || "all";
  const accountTypeFilter = searchParams.get("account_type") || "all";
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";

  const updateFilters = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    inputRef,
    inputValue: searchInput,
    onInputChange,
    urlValue: urlSearch,
  } = useDebouncedUrlSearchInput(searchParams, updateFilters);

  const accountsQueryKey = [
    "processing-accounts",
    page,
    urlSearch,
    statusFilter,
    accountTypeFilter,
    fromDateFilter,
    toDateFilter,
  ] as const;

  const statsQueryKey = [
    "processing-accounts-stats",
    urlSearch,
    fromDateFilter,
    toDateFilter,
    accountTypeFilter,
  ] as const;

  // React Query for fetching accounts
  const {
    data: accountsResponse,
    isLoading: accountsLoading,
    error: accountsError,
  } = useQuery({
    queryKey: accountsQueryKey,
    queryFn: () =>
      getProcessingAccounts({
        page,
        pageSize: 10,
        search: urlSearch,
        status: statusFilter as ProcessingAccountStatus | "all",
        from_date: fromDateFilter,
        to_date: toDateFilter,
        account_type: accountTypeFilter,
      }),
    staleTime: 30000,
  });

  // React Query for fetching stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () =>
      getProcessingAccountStats({
        search: urlSearch,
        from_date: fromDateFilter,
        to_date: toDateFilter,
        account_type: accountTypeFilter,
      }),
    staleTime: 30000,
  });

  const {
    data: initialAccounts = [],
    count = 0,
    totalPages = 1,
    pageSize = 10,
  } = accountsResponse || {};

  const statusMutation = useMutation({
    mutationFn: ({
      accountId,
      status,
    }: {
      accountId: string;
      status: ProcessingAccountStatus | null;
    }) => updateProcessingAccountStatus(accountId, status || ""),
    onMutate: async ({ accountId, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["processing-accounts"] }),
        queryClient.cancelQueries({ queryKey: ["processing-accounts-stats"] }),
      ]);

      const previousAccountsResponse =
        queryClient.getQueryData<typeof accountsResponse>(accountsQueryKey);
      const previousStats =
        queryClient.getQueryData<ProcessingAccountStats>(statsQueryKey);
      const previousAccount = previousAccountsResponse?.data.find(
        (account) => account.id === accountId,
      );

      queryClient.setQueryData<typeof accountsResponse>(
        accountsQueryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((account) =>
              account.id === accountId ? { ...account, status } : account,
            ),
          };
        },
      );

      if (previousStats && previousAccount?.status !== status) {
        queryClient.setQueryData<ProcessingAccountStats>(statsQueryKey, {
          ...previousStats,
          ...(previousAccount?.status
            ? {
                [previousAccount.status]: Math.max(
                  0,
                  previousStats[previousAccount.status] - 1,
                ),
              }
            : {}),
          ...(status
            ? {
                [status]: previousStats[status] + 1,
              }
            : {}),
        });
      }

      if (viewingAccount?.id === accountId) {
        setViewingAccount((account) =>
          account ? { ...account, status } : account,
        );
      }
      if (editingAccount?.id === accountId) {
        setEditingAccount((account) =>
          account ? { ...account, status } : account,
        );
      }

      return { previousAccountsResponse, previousStats };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAccountsResponse) {
        queryClient.setQueryData(
          accountsQueryKey,
          context.previousAccountsResponse,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(statsQueryKey, context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-accounts"] });
      queryClient.invalidateQueries({
        queryKey: ["processing-accounts-stats"],
      });
    },
  });

  // Delete processing account mutation with optimistic updates
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { deleteProcessingAccount } =
        await import("@/lib/actions/processing-accounts");
      return deleteProcessingAccount(accountId);
    },
    onMutate: async (accountId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["processing-accounts"],
      });

      // Snapshot previous data
      const previousAccountsResponse = queryClient.getQueryData(accountsQueryKey);

      // Snapshot stats query
      const previousStats = queryClient.getQueryData(statsQueryKey);

      // Optimistically update main query cache
      queryClient.setQueryData(accountsQueryKey, (old: typeof accountsResponse) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((a: any) => a.id !== accountId),
          count: Math.max(0, old.count - 1),
          totalPages: Math.max(1, Math.ceil((old.count - 1) / old.pageSize)),
        };
      });

      return { previousAccountsResponse, previousStats };
    },
    onError: (_err, _accountId, context) => {
      // Rollback on error
      if (context?.previousAccountsResponse) {
        queryClient.setQueryData(
          accountsQueryKey,
          context.previousAccountsResponse,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(statsQueryKey, context.previousStats);
      }
    },
    onSuccess: () => {
      // Invalidate both queries
      queryClient.invalidateQueries({
        queryKey: ["processing-accounts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["processing-accounts-stats"],
      });
    },
  });

  // Create processing account mutation with invalidation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      // Mutation is triggered via ProcessingAccountFormDialog.onSuccess
      // This just invalidates queries after successful creation
    },
    onSuccess: () => {
      // Invalidate both queries
      queryClient.invalidateQueries({
        queryKey: ["processing-accounts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["processing-accounts-stats"],
      });
    },
  });

  const defaultStats: ProcessingAccountStats = {
    total: 0,
    active: 0,
    not_working: 0,
    closed: 0,
    reversal_issue: 0,
    under_review: 0,
  };

  const currentStats = stats || defaultStats;

  const canManage =
    userRole === "super_admin" ||
    userRole === "sales_agent" ||
    userRole === "processor";

  const isLoading = accountsLoading || statsLoading;

  const statCards = [
    {
      label: "Active Accounts",
      value: currentStats.active,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      cardTint: "from-emerald-500/[0.12] to-teal-500/[0.06]",
      filterValue: "active",
    },
    {
      label: "Not Working",
      value: currentStats.not_working,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      cardTint: "from-rose-500/[0.12] to-red-500/[0.06]",
      filterValue: "not_working",
    },
    {
      label: "Closed",
      value: currentStats.closed,
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      cardTint: "from-slate-500/[0.12] to-zinc-500/[0.06]",
      filterValue: "closed",
    },
    {
      label: "Reversal Issues",
      value: currentStats.reversal_issue,
      icon: AlertOctagon,
      color: "text-warning",
      bgColor: "bg-warning/10",
      cardTint: "from-amber-500/[0.12] to-orange-500/[0.06]",
      filterValue: "reversal_issue",
    },
    {
      label: "Under Review",
      value: currentStats.under_review,
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
      cardTint: "from-violet-500/[0.12] to-indigo-500/[0.06]",
      filterValue: "under_review",
    },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-5 w-96 animate-pulse rounded bg-muted/50" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-11 w-48 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-11 w-56 animate-pulse rounded-lg bg-muted/70" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/80" />
                  </div>
                  <div className="h-12 w-12 animate-pulse rounded-full bg-muted/70" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-muted/70" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="h-11 w-full animate-pulse rounded-lg bg-muted/70 sm:min-w-[280px]" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-muted/70 sm:w-[190px]" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-muted/70 sm:w-[180px]" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-muted/70 sm:w-[260px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="mb-3 flex items-center gap-4 border-b border-border pb-3">
                  {[
                    "Account Holder",
                    "Type",
                    "Routing/Card",
                    "Account/Expiry",
                    "CVV",
                    "Address",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-24 animate-pulse rounded bg-muted/60"
                    />
                  ))}
                </div>

                {/* Table Rows */}
                {[...Array(10)].map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-center gap-4 border-b border-border/50 py-4"
                  >
                    <div className="w-40">
                      <div className="h-5 w-24 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" />
                    <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
                    <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
                    <div className="h-5 w-12 animate-pulse rounded bg-muted/60" />
                    <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
                    <div className="h-6 w-24 animate-pulse rounded-md bg-muted/70" />
                    <div className="h-5 w-24 animate-pulse rounded bg-muted/60" />
                    <div className="flex w-32 items-center justify-end gap-1.5">
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                      <div className="h-8 w-20 animate-pulse rounded-md bg-muted/70" />
                      <div className="h-8 w-16 animate-pulse rounded bg-muted/70" />
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                      <div className="h-8 w-8 animate-pulse rounded-md bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (accountsError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Processing Database</h1>
            <p className="text-muted-foreground">
              Manage checking accounts used for daily sales processing
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Error loading data"
              description={
                accountsError instanceof Error
                  ? accountsError.message
                  : "An error occurred while loading processing accounts"
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processing Database</h1>
          <p className="text-muted-foreground">
            Manage checking accounts used for daily sales processing
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <FileUp className="h-4 w-4" /> Upload CSV / Excel
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Processing Account
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isActive = statusFilter === stat.filterValue;
          return (
            <Card
              key={stat.label}
              className={cn(
                "cursor-pointer bg-gradient-to-br transition-all hover:shadow-md",
                stat.cardTint,
                isActive ? "ring-2 ring-primary/60" : "",
              )}
              onClick={() =>
                updateFilters({
                  status: isActive ? "all" : stat.filterValue,
                })
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p
                      className={cn("mt-2 text-3xl font-semibold", stat.color)}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn("rounded-full p-3", stat.bgColor)}>
                    <Icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground hover:text-primary">
                  View Accounts →
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg">Accounts</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search by name, address, notes..."
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                id="account_type_filter"
                value={accountTypeFilter}
                onChange={(e) =>
                  updateFilters({ account_type: e.target.value })
                }
                options={[
                  { value: "all", label: "All Types" },
                  { value: "checkin", label: "CheckIn" },
                  { value: "card", label: "Credit / Debit Card" },
                ]}
                containerClassName="sm:w-[190px]"
              />
              <Select
                id="status_filter"
                value={statusFilter}
                onChange={(e) => updateFilters({ status: e.target.value })}
                options={[
                  { value: "all", label: "All Statuses" },
                  ...PROCESSING_ACCOUNT_STATUSES,
                ]}
                containerClassName="sm:w-[180px]"
              />
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDateFilter, toDateFilter)}
                onApply={(range) =>
                  updateFilters({ ...toFilterDates(range), page: 1 })
                }
                triggerClassName="h-11 w-full justify-start text-left font-normal sm:w-[260px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {count} accounts found
            </p>
            <TableDataExport
              filenameBase="processing-accounts"
              headers={[
                "Account Type",
                "Account Holder Name",
                "Routing Number",
                "Account Number",
                "Card Number",
                "Expiration Date",
                "CVV",
                "Billing Address",
                "Status",
                "Notes",
                "Date",
              ]}
              rows={initialAccounts.map((a) => [
                a.account_type === "card"
                  ? "Credit/Debit Card"
                  : "CheckIn Account",
                a.account_holder_name || "",
                a.routing_number,
                a.account_number,
                a.account_type === "card"
                  ? formatProcessingCardNumber(a.card_number, userRole).replace(
                      "—",
                      ""
                    )
                  : "",
                a.expiration_date,
                a.account_type === "card"
                  ? formatProcessingCvv(a.cvv, userRole).replace("—", "")
                  : "",
                a.billing_address || "",
                a.status ? statusConfig[a.status].label : "",
                a.notes || "",
                formatDate(String(a.created_at || "")),
              ])}
              disabled={initialAccounts.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {initialAccounts.length === 0 ? (
            <EmptyState
              title="No processing accounts found"
              description={
                urlSearch ||
                statusFilter !== "all" ||
                accountTypeFilter !== "all" ||
                fromDateFilter ||
                toDateFilter
                  ? "Try adjusting your search or filters"
                  : "Add your first processing account to get started"
              }
              action={
                canManage &&
                !urlSearch &&
                statusFilter === "all" &&
                accountTypeFilter === "all" &&
                !fromDateFilter &&
                !toDateFilter ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Processing Account
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Holder Name</TableHead>
                    <TableHead className="min-w-[90px]">Type</TableHead>
                    <TableHead className="min-w-[160px]">
                      Routing / Card No.
                    </TableHead>
                    <TableHead className="min-w-[160px]">
                      Account No. / Expiry
                    </TableHead>
                    <TableHead className="min-w-[60px]">CVV</TableHead>
                    <TableHead>Billing Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialAccounts.map((account) => {
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="align-middle">
                          <span className="font-medium leading-none">
                            {account.account_holder_name?.trim() || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          {account.account_type === "card" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              <CreditCard className="h-3 w-3" />
                              Card
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <Building2 className="h-3 w-3" />
                              CheckIn
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-sm whitespace-nowrap min-w-[160px]">
                          {account.account_type === "card"
                            ? formatProcessingCardNumber(
                                account.card_number,
                                userRole
                              )
                            : account.routing_number?.trim() || "—"}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-sm whitespace-nowrap min-w-[160px]">
                          {account.account_type === "card"
                            ? account.expiration_date?.trim() || "—"
                            : account.account_number?.trim() || "—"}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-sm whitespace-nowrap">
                          {account.account_type === "card"
                            ? formatProcessingCvv(account.cvv, userRole)
                            : "—"}
                        </TableCell>
                        <TableCell className="align-middle">
                          <span
                            className="block max-w-[200px] truncate text-sm"
                            title={
                              account.billing_address
                                ? account.billing_address
                                : undefined
                            }
                          >
                            {account.billing_address}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <StatusDropdown
                            currentStatus={account.status}
                            onStatusChange={async (status) => {
                              await statusMutation.mutateAsync({
                                accountId: account.id,
                                status,
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="align-middle text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(String(account.created_at || ""))}
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Eye — view details */}
                            <button
                              type="button"
                              onClick={() => setViewingAccount(account)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Notes dropdown */}
                            <NotesPopover
                              accountId={account.id}
                              initialNotes={account.notes}
                            />

                            {canManage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setNotifyAccountId(account.id)}
                                  title="Notify Admin"
                                  className="h-8 px-2 text-xs"
                                >
                                  Notify
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAccount(account)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  title="Edit account"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <DeleteProcessingAccountButton
                                  id={account.id}
                                  name={String(
                                    account.account_holder_name ?? "",
                                  )}
                                  onDeleted={() =>
                                    deleteAccountMutation.mutate(account.id)
                                  }
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {/* View Account Dialog */}
      {viewingAccount && (
        <ViewAccountDialog
          account={viewingAccount}
          userRole={userRole}
          onClose={() => setViewingAccount(null)}
        />
      )}

      {showImport && (
        <ProcessingAccountsImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <ProcessingAccountFormDialog
          open={showForm}
          userRole={userRole}
          onClose={() => setShowForm(false)}
          onSuccess={() => createAccountMutation.mutate()}
        />
      )}

      {editingAccount && (
        <ProcessingAccountFormDialog
          open={!!editingAccount}
          account={editingAccount}
          userRole={userRole}
          onClose={() => setEditingAccount(null)}
        />
      )}

      {notifyAccountId && (
        <NotifyAdminDialog
          open
          accountId={notifyAccountId}
          onClose={() => setNotifyAccountId(null)}
        />
      )}
    </div>
  );
}
