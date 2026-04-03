"use client";

import { useState, useTransition } from "react";
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
import { EmptyState, Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { SALE_TYPES } from "@/lib/constants";
import { deleteSale } from "@/lib/actions/sales";
import type { UserRole } from "@/lib/types";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
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
  const typeFilter = searchParams.get("type") || "all";
  const agentFilter = searchParams.get("agent_id") || "all";

  const canCreate = userRole === "super_admin" || userRole === "sales_agent";

  const canEditSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" || (userRole === "sales_agent" && sale.agent_id === userId);

  const canDeleteSale = (sale: (typeof sales)[number]) =>
    userRole === "super_admin" || (userRole === "sales_agent" && sale.agent_id === userId);

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
            {userRole === "processor" ? "View and search all sales" : "Track your sales pipeline"}
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
              options={[{ value: "all", label: "All Types" }, ...SALE_TYPES]}
              value={typeFilter}
              onChange={(e) => updateFilters({ type: e.target.value })}
            />
            {userRole !== "sales_agent" && (
              <Select
                options={[
                  { value: "all", label: "All Agents" },
                  ...agents.map((a) => ({ value: a.id, label: a.full_name })),
                ]}
                value={agentFilter}
                onChange={(e) => updateFilters({ agent_id: e.target.value })}
              />
            )}
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
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
                        <span className="text-sm">{sale.agent?.full_name || "N/A"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(sale.created_at)}</TableCell>
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
