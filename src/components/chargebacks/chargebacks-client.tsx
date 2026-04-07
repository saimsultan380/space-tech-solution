"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select as SelectField } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { ChargebackFormDialog } from "./chargeback-form-dialog";
import { deleteChargeback, updateChargebackStatus } from "@/lib/actions/chargebacks";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHARGEBACK_STATUSES } from "@/lib/constants";
import type { UserRole, ChargebackStatus } from "@/lib/types";
import {
  Plus,
  Trash2,
  ListX,
  CircleDollarSign,
  Clock3,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import { downloadTableXlsx } from "@/lib/table-export";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  open: "warning",
  resolved: "success",
  disputed: "destructive",
};

interface ChargebacksClientProps {
  chargebacksResponse: {
    data: Array<{
      id: string;
      date: string;
      reason: string;
      status: string;
      created_at: string;
      assigned_to: string | null;
      sale: {
        id: string;
        created_at: string;
        sale_type?: string | null;
        subtype?: string | null;
        charged_amount?: number | null;
        company_name: string;
        customer_email?: string | null;
        agent_id: string;
        customer_name?: string | null;
        agent: { full_name: string } | null;
      } | null;
      assignee: { id: string; full_name: string } | null;
    }>;
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    stats: {
      total: number;
      open: number;
      resolved: number;
      disputed: number;
      assigned: number;
      impactedAmount: number;
    };
  };
  userRole: UserRole;
  assignees: Array<{ id: string; full_name: string }>;
}

export function ChargebacksClient({ chargebacksResponse, userRole, assignees }: ChargebacksClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { currency } = useCurrency();

  const { data: chargebacks, count, page, totalPages, pageSize, stats } = chargebacksResponse;

  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canCreate = userRole === "super_admin" || userRole === "processor" || userRole === "sales_agent";
  const canManage = userRole === "super_admin" || userRole === "processor";

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
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

  const { inputRef, inputValue: searchInput, onInputChange } = useDebouncedUrlSearchInput(searchParams, updateFilters);
  const statusFilter = searchParams.get("status") || "all";
  const assignedToFilter = searchParams.get("assigned_to") || "all";
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateChargebackStatus(id, status as ChargebackStatus);
    } catch {
      // error handling
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this chargeback? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteChargeback(id);
    } catch {
      // error handling
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chargebacks</h1>
          <p className="text-muted-foreground">Manage and track chargebacks</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Chargeback
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total chargebacks</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ListX className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Impacted amount</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <CircleDollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(stats.impactedAmount, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Open</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Resolved</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.resolved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Disputed</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.disputed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserCheck className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.assigned}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {count} chargeback{count !== 1 ? "s" : ""}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={chargebacks.length === 0}
              onClick={() =>
                downloadTableXlsx(
                  [
                    "Customer",
                    "Company",
                    "Type",
                    "Amount",
                    "Agent",
                    "Sale Date",
                    "Assigned to",
                    "Chargeback Date",
                    "Reason",
                    "Status",
                  ],
                  chargebacks.map((cb) => [
                    cb.sale?.customer_name || "N/A",
                    cb.sale?.company_name || "N/A",
                    cb.sale?.sale_type ? `${cb.sale.sale_type} ${cb.sale.subtype ? `(${cb.sale.subtype})` : ""}` : "N/A",
                    cb.sale?.charged_amount != null ? formatCurrency(Number(cb.sale.charged_amount), currency) : "N/A",
                    cb.sale?.agent?.full_name || "N/A",
                    cb.sale?.created_at ? formatDate(cb.sale.created_at) : "N/A",
                    cb.assignee?.full_name || "—",
                    cb.date ? formatDate(cb.date) : "N/A",
                    cb.reason,
                    cb.status,
                  ]),
                  "chargebacks",
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Export
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="relative sm:col-span-2 xl:col-span-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search by chargeback reason..."
                value={searchInput}
                onChange={(e) => onInputChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="xl:col-span-2 min-w-0">
              <SelectField
                options={[{ value: "all", label: "All Statuses" }, ...CHARGEBACK_STATUSES]}
                value={statusFilter}
                onChange={(e) => updateFilters({ status: e.target.value })}
              />
            </div>
            {userRole !== "sales_agent" && (
              <div className="xl:col-span-2 min-w-0">
                <SelectField
                  options={[
                    { value: "all", label: "All Assignees" },
                    ...assignees.map((u) => ({ value: u.id, label: u.full_name })),
                  ]}
                  value={assignedToFilter}
                  onChange={(e) => updateFilters({ assigned_to: e.target.value })}
                />
              </div>
            )}
            <div className="sm:col-span-1 xl:col-span-2 min-w-[180px]">
              <Input
                type="date"
                value={fromDateFilter}
                onChange={(e) => updateFilters({ from_date: e.target.value, page: 1 })}
                aria-label="From date"
                className="w-full min-w-[180px] [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div className="sm:col-span-1 xl:col-span-2 min-w-[180px]">
              <Input
                type="date"
                value={toDateFilter}
                onChange={(e) => updateFilters({ to_date: e.target.value, page: 1 })}
                aria-label="To date"
                className="w-full min-w-[180px] [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2 min-w-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  updateFilters({
                    q: "",
                    status: "all",
                    assigned_to: "all",
                    from_date: "",
                    to_date: "",
                  })
                }
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {chargebacks.length === 0 ? (
            <EmptyState title="No chargebacks" description="Chargebacks will appear here" />
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="min-w-[180px]">Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="whitespace-nowrap">Sale Date</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead className="whitespace-nowrap">Chargeback Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="min-w-[170px] text-right whitespace-nowrap">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargebacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell className="font-medium">
                      {cb.sale?.id ? (
                        <div className="flex flex-col">
                          <Link href={`/dashboard/sales/${cb.sale.id}`} className="text-foreground hover:underline">
                            {cb.sale?.customer_name || "N/A"}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">{cb.sale?.customer_email || ""}</span>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell className="min-w-[180px]">{cb.sale?.company_name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize">{cb.sale?.sale_type || "N/A"}</span>
                        <span className="text-[11px] text-muted-foreground uppercase">
                          {cb.sale?.subtype || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {cb.sale?.charged_amount != null ? formatCurrency(Number(cb.sale.charged_amount), currency) : "N/A"}
                    </TableCell>
                    <TableCell>{cb.sale?.agent?.full_name || "N/A"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cb.sale?.created_at ? formatDate(cb.sale.created_at) : "N/A"}
                    </TableCell>
                    <TableCell>{cb.assignee?.full_name || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(cb.date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{cb.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[cb.status] || "default"} className="capitalize">
                        {cb.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="relative">
                            <SelectField
                              options={CHARGEBACK_STATUSES}
                              value={cb.status}
                              onChange={(e) => handleStatusChange(cb.id, e.target.value)}
                              className="w-[120px] min-w-[120px]"
                              disabled={updatingId === cb.id || deletingId === cb.id}
                            />
                            {updatingId === cb.id && (
                              <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2">
                                <Spinner />
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(cb.id)}
                            disabled={deletingId === cb.id || updatingId === cb.id}
                            title="Delete chargeback"
                            aria-label="Delete chargeback"
                          >
                            {deletingId === cb.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
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

      {showForm && <ChargebackFormDialog open onClose={() => setShowForm(false)} />}
    </div>
  );
}
