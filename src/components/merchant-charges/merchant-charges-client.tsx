"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listMerchantChargeRequests } from "@/lib/actions/merchant-charges";
import { ChargeStatusPill } from "@/components/sales/charge-progress";
import { formatCurrency, formatInAppZone } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Spinner } from "@/components/ui/loading";
import {
  DropdownRangeDatePicker,
  toDateRangeFromFilters,
  toFilterDates,
} from "@/components/ui/dropdown-range-date-picker";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  Search,
  XCircle,
  Zap,
} from "@/components/ui/icons";
import { parsePageSize } from "@/lib/page-size";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import type { ChargeRequestStatus, SaleChargeRequest } from "@/lib/types";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "viewed", label: "Viewed" },
  { value: "charging", label: "Charging" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "open", label: "Needs action" },
];

function requestAmount(request: SaleChargeRequest) {
  if (request.charge_amount != null && Number.isFinite(Number(request.charge_amount))) {
    return Number(request.charge_amount);
  }
  return Number(request.charged_amount || 0);
}

function matchesSearch(request: SaleChargeRequest, query: string) {
  if (!query) return true;
  const haystack = [
    request.customer_name,
    request.company_name,
    request.agent_name,
    request.merchant_name,
    request.charge_merchant_name,
    request.charge_email,
    request.charge_phone,
    request.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function inDateRange(value: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const day = String(value).slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function needsAction(status: ChargeRequestStatus) {
  return status === "pending" || status === "viewed" || status === "charging";
}

export function MerchantChargesClient() {
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const statusFilter = searchParams.get("status") || "all";
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["merchant-charges"],
    queryFn: listMerchantChargeRequests,
    refetchInterval: 10000,
  });

  const updateFilters = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        const empty =
          value === undefined ||
          value === "" ||
          value === "all" ||
          (key === "page" && Number(value) <= 1);
        if (empty) params.delete(key);
        else params.set(key, String(value));
      });
      if (!("page" in patch)) params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const {
    inputRef,
    inputValue: searchInput,
    onInputChange,
    urlValue: urlSearch,
  } = useDebouncedUrlSearchInput(searchParams, updateFilters);

  const filtered = useMemo(() => {
    const query = urlSearch.trim().toLowerCase();
    return data.filter((request) => {
      if (statusFilter === "open") {
        if (!needsAction(request.status)) return false;
      } else if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (!matchesSearch(request, query)) return false;
      if (!inDateRange(request.created_at, fromDate, toDate)) return false;
      return true;
    });
  }, [data, statusFilter, urlSearch, fromDate, toDate]);

  const stats = useMemo(() => {
    const base = {
      total: data.length,
      pending: 0,
      viewed: 0,
      charging: 0,
      approved: 0,
      declined: 0,
      open: 0,
      approvedAmount: 0,
      openAmount: 0,
    };
    for (const request of data) {
      base[request.status] += 1;
      const amount = requestAmount(request);
      if (needsAction(request.status)) {
        base.open += 1;
        base.openAmount += amount;
      }
      if (request.status === "approved") base.approvedAmount += amount;
    }
    return base;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const clearFilters = () => {
    onInputChange("");
    router.push(pathname);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Card charges</h1>
          <p className="text-muted-foreground">Requests assigned to you for card charging.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Could not load charges"
              description={error instanceof Error ? error.message : "Try again in a moment."}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Card charges</h1>
        <p className="text-muted-foreground">
          Requests assigned to you. Open one to view the card. Starting a charge locks it so it cannot be charged twice.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-500/[0.12] to-indigo-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total requests</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/[0.12] to-yellow-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Needs action</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <Zap className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.open}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatCurrency(stats.openAmount, currency)} waiting
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-500/[0.12] to-blue-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Viewed / charging</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
                <Eye className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.viewed + stats.charging}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats.viewed} viewed · {stats.charging} charging
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Approved</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.approved}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatCurrency(stats.approvedAmount, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/[0.12] to-red-500/[0.06]">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Declined</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.declined}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <Clock3 className="mr-1 inline h-3 w-3" />
              {stats.pending} still pending
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="relative sm:col-span-2 xl:col-span-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search customer, company, agent, phone, email..."
                value={searchInput}
                onChange={(event) => onInputChange(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="xl:col-span-2 min-w-0">
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(event) => updateFilters({ status: event.target.value, page: 1 })}
              />
            </div>
            <div className="sm:col-span-1 xl:col-span-4 min-w-[220px]">
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDate, toDate)}
                onApply={(range) => updateFilters({ ...toFilterDates(range), page: 1 })}
                triggerClassName="h-11 w-full justify-start text-left font-normal"
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2 min-w-0">
              <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : pageRows.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState
                title="No charge requests"
                description={
                  data.length === 0
                    ? "New card sales sent to you will show up here."
                    : "Adjust your filters to see matching requests."
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Customer</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((request) => (
                      <TableRow key={request.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {request.customer_name || "—"}
                            </span>
                            {request.charge_phone || request.charge_email ? (
                              <span className="text-[11px] text-muted-foreground">
                                {request.charge_phone || request.charge_email}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{request.company_name || "—"}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(requestAmount(request), currency)}
                        </TableCell>
                        <TableCell>{request.agent_name || "—"}</TableCell>
                        <TableCell>
                          {request.charge_merchant_name || request.merchant_name || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatInAppZone(request.created_at, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <ChargeStatusPill
                            status={request.status}
                            viewedAt={request.viewed_at}
                            decidedAt={request.decided_at}
                            declineReason={request.decline_reason}
                            remarks={request.remarks}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/merchant-charges/${request.id}`}
                            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {needsAction(request.status) ? "Open" : "View"}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={(next) => updateFilters({ page: next })}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
