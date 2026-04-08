"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerButton } from "./delete-customer-button";
import { formatDate } from "@/lib/utils";
import { dismissProcessorCallLogsDashboardCta } from "@/lib/nav-access";
import type { UserRole } from "@/lib/types";
import { Plus, Search, Eye, CalendarDays } from "lucide-react";
import Link from "next/link";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";

interface CustomersClientProps {
  customersResponse: {
    data: any[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userRole: UserRole;
}

export function CustomersClient({
  customersResponse,
  userRole,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (userRole === "processor") {
      dismissProcessorCallLogsDashboardCta();
    }
  }, [userRole]);

  const {
    data: customers,
    count,
    page,
    totalPages,
    pageSize,
  } = customersResponse;

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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const { inputRef, inputValue: searchInput, onInputChange, urlValue: urlSearch } =
    useDebouncedUrlSearchInput(searchParams, updateFilters);

  const dateFilter = searchParams.get("date") || "";
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  /** Super admin, sales agents, and processors (when given Call Logs access) use full list management UI. */
  const canManageCallLogs =
    userRole === "super_admin" ||
    userRole === "sales_agent" ||
    userRole === "processor";

  const exportRows = customers.map((c) => [
    c.name,
    c.email,
    c.phone,
    c.dob ? formatDate(c.dob) : "-",
    c.recent_note || "-",
    c.created_by_user?.full_name || "-",
    formatDate(c.created_at),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Call Logs Responses</h1>
          <p className="text-muted-foreground">
            Manage your call logs responses database
          </p>
        </div>
        <div className="flex w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-2 lg:w-auto lg:shrink-0">
          <TableDataExport
            filenameBase="call-logs-responses"
            headers={["Name", "Email", "Phone", "DOB", "Recent Note", "Agent Name", "Created"]}
            rows={exportRows}
            disabled={customers.length === 0}
            className="w-full sm:w-auto [&_button]:min-h-11 [&_button]:flex-1 sm:[&_button]:flex-initial sm:[&_button]:min-h-9"
          />
          {canManageCallLogs && (
            <Button
              onClick={() => setShowForm(true)}
              className="h-11 w-full shrink-0 whitespace-nowrap sm:h-9 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Add Call Log Response
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-0 pb-4 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search call logs responses..."
                  value={searchInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="h-11 pl-10 sm:h-11"
                  aria-label="Search call logs responses"
                />
              </div>
              <div className="relative w-full max-w-[152px] shrink-0 sm:w-[152px] sm:max-w-[152px]">
                <Input
                  ref={dateInputRef}
                  id="call_logs_created_date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => updateFilters({ date: e.target.value, page: 1 })}
                  className="h-11 w-full max-w-full pr-10 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden sm:h-11"
                  aria-label="Filter by date"
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Open date picker"
                >
                  <CalendarDays className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground md:max-w-[min(100%,14rem)] md:text-right">
              {count} call log response{count !== 1 ? "s" : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {customers.length === 0 ? (
            <EmptyState
              title="No call logs responses found"
              description={
                urlSearch || dateFilter
                  ? "Try adjusting your search or created date filter"
                  : "Add your first call log response to get started"
              }
              action={
                canManageCallLogs && !urlSearch && !dateFilter ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Call Log Response
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Recent Note</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageCallLogs && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/call-logs-responses/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>
                        {customer.dob ? formatDate(customer.dob) : "-"}
                      </TableCell>
                      <TableCell>
                        {customer.recent_note ? (
                          <span
                            className="block max-w-[340px] truncate text-sm text-muted-foreground"
                            title={customer.recent_note}
                          >
                            {customer.recent_note}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{customer.created_by_user?.full_name || "-"}</TableCell>
                      <TableCell>{formatDate(customer.created_at)}</TableCell>
                      {canManageCallLogs && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/call-logs-responses/${customer.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <CustomerFormDialog customer={customer} />
                            <DeleteCustomerButton
                              id={customer.id}
                              name={customer.name}
                            />
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

      {showForm && (
        <CustomerFormDialog open onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
