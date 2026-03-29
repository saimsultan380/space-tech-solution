"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { SALE_STATUSES, SALE_TYPES } from "@/lib/constants";
import { bulkUpdateSaleStatus, deleteSale } from "@/lib/actions/sales";
import type { UserRole } from "@/lib/types";
import { Plus, Search, CheckCircle, XCircle, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

interface SalesClientProps {
  salesResponse: {
    data: any[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  agents: Array<{ id: string; full_name: string }>;
  userRole: UserRole;
  userId: string;
}

export function SalesClient({ salesResponse, agents, userRole, userId }: SalesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: sales, count, page, totalPages, pageSize } = salesResponse;

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

  const { inputRef, inputValue: searchInput, onInputChange } = useDebouncedUrlSearchInput(
    searchParams,
    updateFilters,
  );
  const statusFilter = searchParams.get("status") || "all";
  const typeFilter = searchParams.get("type") || "all";
  const agentFilter = searchParams.get("agent_id") || "all";

  const canCreate = userRole === "super_admin" || userRole === "sales_agent";
  const canBulkProcess = userRole === "processor" || userRole === "super_admin";

  const canEditSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" || (userRole === "sales_agent" && sale.agent_id === userId);

  const canDeleteSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" || (userRole === "sales_agent" && sale.agent_id === userId);
  
  const pendingSelected = [...selected].filter((id) =>
    sales.find((s) => s.id === id && s.status === "pending")
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = sales.filter((s) => s.status === "pending").map((s) => s.id);
    if (pendingIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const salesExportRows = useMemo(
    () =>
      sales.map((sale) => [
        sale.customer?.name || "N/A",
        sale.customer?.email || "",
        sale.company_name,
        sale.sale_type,
        sale.subtype,
        formatCurrency(sale.charged_amount, currency),
        sale.status,
        sale.agent?.full_name || "N/A",
        formatDate(sale.created_at),
      ]),
    [sales, currency],
  );

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (pendingSelected.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkUpdateSaleStatus(
        pendingSelected,
        status,
        `Bulk ${status} from sales page`
      );
      setSelected(new Set());
    } catch {
      // error
    }
    setBulkLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteSale(saleToDelete.id);
      setSaleToDelete(null);
      router.refresh();
    } catch {
      // surfaced via toast elsewhere if needed
    }
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            {userRole === "processor" ? "Process and manage sales" : "Track your sales pipeline"}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Link href="/dashboard/sales/new">
              <Button>
                <Plus className="h-4 w-4" /> New Sale
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search by customer name, email, phone, or company..."
                value={searchInput}
                onChange={(e) => onInputChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[{ value: "all", label: "All Statuses" }, ...SALE_STATUSES]}
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
            />
            <Select
              options={[{ value: "all", label: "All Types" }, ...SALE_TYPES]}
              value={typeFilter}
              onChange={(e) => updateFilters({ type: e.target.value })}
            />
            {userRole !== "sales_agent" && (
              <Select
                options={[{ value: "all", label: "All Agents" }, ...agents.map(a => ({ value: a.id, label: a.full_name }))]}
                value={agentFilter}
                onChange={(e) => updateFilters({ agent_id: e.target.value })}
              />
            )}
          </div>

          {/* Bulk actions bar */}
          {canBulkProcess && pendingSelected.length > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <span className="text-sm font-medium">
                {pendingSelected.length} pending sale{pendingSelected.length !== 1 ? "s" : ""} selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-500 text-white hover:bg-green-600 shadow-none"
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction("approved")}
                >
                  {bulkLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-500 text-white hover:bg-red-600 shadow-none"
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction("rejected")}
                >
                  {bulkLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Reject All
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <TableDataExport
              filenameBase="sales"
              headers={[
                "Customer",
                "Customer Email",
                "Company",
                "Type",
                "Subtype",
                "Amount",
                "Status",
                "Agent",
                "Date",
              ]}
              rows={salesExportRows}
              disabled={sales.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          <div className="overflow-x-auto">
            {sales.length === 0 ? (
              <EmptyState title="No sales found" description="Adjust your filters or create a new sale" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {canBulkProcess && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={
                            sales.filter((s) => s.status === "pending").length > 0 &&
                            sales
                              .filter((s) => s.status === "pending")
                              .every((s) => selected.has(s.id))
                          }
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className={selected.has(sale.id) ? "bg-primary/5 hover:bg-muted/30" : "hover:bg-muted/30"}
                    >
                      {canBulkProcess && (
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 disabled:opacity-30"
                            checked={selected.has(sale.id)}
                            onChange={() => toggleSelect(sale.id)}
                            disabled={sale.status !== "pending"}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="text-foreground hover:underline"
                          >
                            {sale.customer?.name || "N/A"}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">{sale.customer?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sale.company_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="capitalize">{sale.sale_type}</span>
                          <span className="text-[11px] text-muted-foreground uppercase">{sale.subtype}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(sale.charged_amount, currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[sale.status] || "default"} className="capitalize">
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{sale.agent?.full_name || "N/A"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sale.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Link href={`/dashboard/sales/${sale.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-transparent"
                              aria-label="View sale"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEditSale(sale) && (
                            <Link href={`/dashboard/sales/${sale.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-transparent"
                                aria-label="Edit sale"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canDeleteSale(sale) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-transparent"
                              aria-label="Delete sale"
                              onClick={() =>
                                setSaleToDelete({
                                  id: sale.id,
                                  label: sale.customer?.name || sale.company_name || "this sale",
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={!!saleToDelete} onClose={() => !deleteLoading && setSaleToDelete(null)}>
        <DialogHeader>
          <DialogTitle>Delete sale</DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-left">
          Are you sure you want to delete the sale for{" "}
          <strong>{saleToDelete?.label}</strong>? Related payments and attachments will be removed.
          This cannot be undone.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSaleToDelete(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirmDelete()} disabled={deleteLoading}>
            {deleteLoading ? <Spinner /> : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
