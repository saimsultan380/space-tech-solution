"use client";

import { useState, useMemo, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MonthField } from "@/components/ui/date-field";
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
import { TableDataExport } from "@/components/ui/table-data-export";
import { ROLE_LABELS, LEAVE_STATUSES } from "@/lib/constants";
import type { Leave } from "@/lib/types";
import { updateLeaveStatus } from "@/lib/actions/leaves";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, CalendarDays, FileText, Clock, CheckCircle, Bot } from "@/components/ui/icons";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface LeavesAdminClientProps {
  leavesResponse: {
    data: Leave[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

function getMonthStartEnd(monthStr: string) {
  const monthStart = `${monthStr}-01`;
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];
  return { monthStart, monthEnd };
}

export function LeavesAdminClient({ leavesResponse }: LeavesAdminClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data: leaves, count, page, totalPages, pageSize } = leavesResponse;

  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
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

  const statusFilter = (searchParams.get("status") as string) || "all";
  const roleFilter = (searchParams.get("role") as string) || "all";
  const monthFilter = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const { monthStart, monthEnd } = getMonthStartEnd(monthFilter);
  
  // We keep some client side filtering for month if needed, but status is handled by server
  const filtered = leaves.filter((leave) => {
    const d = leave.start_date;
    if (monthFilter && (d < monthStart || d >= monthEnd)) return false;
    const role = leave.user?.role;
    const matchesRole = roleFilter === "all" || role === roleFilter;
    return matchesRole;
  });

  const stats = useMemo(() => ({
    total: count,
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
  }), [leaves, count]);

  const handleUpdate = async (id: string, status: "approved" | "rejected") => {
    const key = `${id}-${status}`;
    setUpdatingKey(key);
    try {
      await updateLeaveStatus(id, status);
    } catch {
      // handled by UI error boundaries or toast in higher-level layout
    }
    setUpdatingKey(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            Review and manage leave applications from your team
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {filtered.length} request{filtered.length !== 1 ? "s" : ""} shown
        </div>
      </div>

      {/* Month filter */}
      <div className="flex flex-wrap items-center gap-3">
        <MonthField
          value={monthFilter}
          onChange={(value) => updateFilters({ month: value })}
          className="h-10 w-auto"
        />
        <Select
          options={[{ value: "all", label: "All Statuses" }, ...LEAVE_STATUSES]}
          value={statusFilter}
          onChange={(e) => updateFilters({ status: e.target.value })}
        />
        <Select
          options={[
            { value: "all", label: "All Roles" },
            ...Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ]}
          value={roleFilter}
          onChange={(e) => updateFilters({ role: e.target.value })}
        />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border border-border/60 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.06),transparent_50%)]" />
          <CardContent className="relative flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total requests</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/60 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.08),transparent_50%)]" />
          <CardContent className="relative flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending</p>
              <p className="text-xl font-semibold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/60 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_50%)]" />
          <CardContent className="relative flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Approved</p>
              <p className="text-xl font-semibold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/60 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.06),transparent_50%)]" />
          <CardContent className="relative flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rejected</p>
              <p className="text-xl font-semibold">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {filtered.length} total request{filtered.length !== 1 ? "s" : ""} matching filters
            </CardTitle>
            <TableDataExport
              filenameBase="leave-requests"
              headers={[
                "Employee",
                "Role",
                "Dates",
                "Type",
                "Source",
                "Reason",
                "Status",
                "Applied",
              ]}
              rows={filtered.map((leave) => [
                leave.user?.full_name || "Unknown",
                ROLE_LABELS[leave.user?.role || ""] || leave.user?.role || "N/A",
                `${formatDate(leave.start_date)}${
                  leave.end_date && leave.end_date !== leave.start_date
                    ? ` - ${formatDate(leave.end_date)}`
                    : ""
                }`,
                leave.type || "N/A",
                leave.source === "auto" ? "Auto" : "Manual",
                leave.reason,
                leave.status,
                formatDate(leave.created_at),
              ])}
              disabled={filtered.length === 0}
              className="shrink-0"
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {filtered.length === 0 ? (
            <EmptyState
              title="No leave requests"
              description="Leave applications from employees will appear here"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dates</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(leave.start_date)}
                      {leave.end_date && leave.end_date !== leave.start_date
                        ? ` - ${formatDate(leave.end_date)}`
                        : ""}
                    </TableCell>
                    <TableCell className="font-medium">
                      {leave.user?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ROLE_LABELS[leave.user?.role || ""] || leave.user?.role || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{leave.type || "N/A"}</TableCell>
                    <TableCell>
                      {leave.source === "auto" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Bot className="h-3 w-3" />
                          Auto
                        </Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={leave.reason}>
                      {leave.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[leave.status] || "default"} className="capitalize">
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(leave.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {leave.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              updatingKey === `${leave.id}-approved` ||
                              updatingKey === `${leave.id}-rejected`
                            }
                            onClick={() => handleUpdate(leave.id, "approved")}
                          >
                            {updatingKey === `${leave.id}-approved` ? (
                              <Spinner />
                            ) : (
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={
                              updatingKey === `${leave.id}-approved` ||
                              updatingKey === `${leave.id}-rejected`
                            }
                            onClick={() => handleUpdate(leave.id, "rejected")}
                          >
                            {updatingKey === `${leave.id}-rejected` ? (
                              <Spinner />
                            ) : (
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No actions</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => updateFilters({ page: p })}
          totalItems={count}
          pageSize={pageSize}
        />
      </Card>
    </div>
  );
}

