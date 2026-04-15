"use client";

import { useState, useTransition } from "react";
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
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { TableDataExport } from "@/components/ui/table-data-export";
import { ProcessingAccountFormDialog } from "./processing-account-form-dialog";
import { ProcessingAccountsImportDialog } from "./processing-accounts-import-dialog";
import { DeleteProcessingAccountButton } from "./delete-processing-account-button";
import { NotifyAdminDialog } from "./notify-admin-dialog";
import { PROCESSING_ACCOUNT_STATUSES } from "@/lib/constants";
import type { UserRole, ProcessingAccountStatus } from "@/lib/types";
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
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { formatDate } from "@/lib/utils";
import { DropdownRangeDatePicker, toDateRangeFromFilters, toFilterDates } from "@/components/ui/dropdown-range-date-picker";

interface ProcessingAccountRow {
  id: string;
  account_holder_name: string;
  routing_number: string;
  account_number: string;
  billing_address: string;
  status: ProcessingAccountStatus | null;
  notes: string | null;
  created_at: string;
}

interface ProcessingAccountsClientProps {
  accountsResponse: {
    data: ProcessingAccountRow[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: ProcessingAccountStats;
  userRole: UserRole;
}

const statusConfig: Record<
  ProcessingAccountStatus,
  { label: string; variant: "success" | "destructive" | "warning" | "secondary" | "default"; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { label: "Active", variant: "success", icon: CheckCircle },
  not_working: { label: "Not Working", variant: "destructive", icon: AlertTriangle },
  closed: { label: "Closed", variant: "secondary", icon: XCircle },
  reversal_issue: { label: "Reversal Issue", variant: "warning", icon: AlertOctagon },
  under_review: { label: "Under Review", variant: "default", icon: Clock },
};

export function ProcessingAccountsClient({
  accountsResponse,
  stats,
  userRole,
}: ProcessingAccountsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ProcessingAccountRow | null>(null);
  const [notifyAccountId, setNotifyAccountId] = useState<string | null>(null);

  const {
    data: accounts,
    count,
    page,
    totalPages,
    pageSize,
  } = accountsResponse;

  const updateFilters = (
    updates: Record<string, string | number | undefined>
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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const { inputRef, inputValue: searchInput, onInputChange, urlValue: urlSearch } =
    useDebouncedUrlSearchInput(searchParams, updateFilters);
  const statusFilter = searchParams.get("status") || "all";
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";

  const canManage = userRole === "super_admin" || userRole === "sales_agent" || userRole === "processor";

  const statCards = [
    {
      label: "Active Accounts",
      value: stats.active,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      filterValue: "active",
    },
    {
      label: "Not Working",
      value: stats.not_working,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      filterValue: "not_working",
    },
    {
      label: "Closed",
      value: stats.closed,
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      filterValue: "closed",
    },
    {
      label: "Reversal Issues",
      value: stats.reversal_issue,
      icon: AlertOctagon,
      color: "text-warning",
      bgColor: "bg-warning/10",
      filterValue: "reversal_issue",
    },
    {
      label: "Under Review",
      value: stats.under_review,
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
      filterValue: "under_review",
    },
  ];

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
              className={`cursor-pointer transition-all hover:shadow-md ${
                isActive ? "ring-2 ring-primary" : ""
              }`}
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
                    <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
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
                  placeholder="Search by account holder name or notes..."
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                onApply={(range) => updateFilters({ ...toFilterDates(range), page: 1 })}
                triggerClassName="h-11 w-full justify-start text-left font-normal sm:w-[260px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{count} accounts found</p>
            <TableDataExport
              filenameBase="processing-accounts"
              headers={[
                "Account Holder Name",
                "Routing Number",
                "Account Number",
                "Billing Address",
                "Status",
                "Notes",
                "Date",
              ]}
              rows={accounts.map((a) => [
                a.account_holder_name,
                a.routing_number,
                a.account_number,
                a.billing_address,
                a.status ? statusConfig[a.status].label : "",
                a.notes || "",
                formatDate(a.created_at),
              ])}
              disabled={accounts.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {accounts.length === 0 ? (
            <EmptyState
              title="No processing accounts found"
              description={
                urlSearch || statusFilter !== "all" || fromDateFilter || toDateFilter
                  ? "Try adjusting your search or filters"
                  : "Add your first processing account to get started"
              }
              action={
                canManage && !urlSearch && statusFilter === "all" && !fromDateFilter && !toDateFilter ? (
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
                    <TableHead>Routing Number</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Billing Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                    {canManage && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const status = account.status ? statusConfig[account.status] : null;
                    const StatusIcon = status?.icon;
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="align-middle">
                          <div className="flex min-h-9 items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {(account.account_holder_name?.trim() || "?")
                                .split(/\s+/)
                                .filter(Boolean)
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "?"}
                            </div>
                            <span className="font-medium leading-none">
                              {account.account_holder_name?.trim() || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle font-mono text-sm break-all max-w-[200px]">
                          {account.routing_number?.trim() || "—"}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-sm break-all max-w-[200px]">
                          {account.account_number?.trim() || "—"}
                        </TableCell>
                        <TableCell className="align-middle">
                          <span
                            className="block max-w-[200px] truncate text-sm"
                            title={account.billing_address}
                          >
                            {account.billing_address}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          {status && StatusIcon ? (
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          {account.notes ? (
                            <span
                              className="block max-w-[180px] truncate text-sm text-muted-foreground"
                              title={account.notes}
                            >
                              {account.notes}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(account.created_at)}
                        </TableCell>
                        {canManage && (
                          <TableCell className="align-middle text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNotifyAccountId(account.id)}
                                title="Notify Admin"
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
                                name={account.account_holder_name}
                              />
                            </div>
                          </TableCell>
                        )}
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

      {showImport && (
        <ProcessingAccountsImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <ProcessingAccountFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingAccount && (
        <ProcessingAccountFormDialog
          open={!!editingAccount}
          account={editingAccount}
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
