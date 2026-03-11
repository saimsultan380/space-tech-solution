"use client";

import { useState } from "react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { SALE_STATUSES, SALE_TYPES } from "@/lib/constants";
import { bulkUpdateSaleStatus } from "@/lib/actions/sales";
import type { UserRole } from "@/lib/types";
import { Plus, Search, CheckCircle, XCircle, Loader2, Eye } from "lucide-react";
import Link from "next/link";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

interface SalesClientProps {
  sales: Array<{
    id: string;
    sale_type: string;
    subtype: string;
    company_name: string;
    charged_amount: number;
    status: string;
    created_at: string;
    customer: { id: string; name: string; email: string; phone: string } | null;
    agent: { id: string; full_name: string } | null;
    processor: { id: string; full_name: string } | null;
  }>;
  agents: Array<{ id: string; full_name: string }>;
  userRole: UserRole;
  userId: string;
}

export function SalesClient({ sales, agents, userRole, userId }: SalesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const { currency } = useCurrency();

  const filtered = sales.filter((s) => {
    const matchesSearch =
      (s.customer?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesType = typeFilter === "all" || s.sale_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const canCreate = userRole === "super_admin" || userRole === "sales_agent";
  const canBulkProcess = userRole === "processor" || userRole === "super_admin";
  const pendingSelected = [...selected].filter((id) =>
    filtered.find((s) => s.id === id && s.status === "pending")
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
    const pendingIds = filtered.filter((s) => s.status === "pending").map((s) => s.id);
    if (pendingIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            {userRole === "processor" ? "Process and manage sales" : "Track your sales pipeline"}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/sales/new">
            <Button>
              <Plus className="h-4 w-4" /> New Sale
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[{ value: "all", label: "All Statuses" }, ...SALE_STATUSES]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              options={[{ value: "all", label: "All Types" }, ...SALE_TYPES]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
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
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState title="No sales found" description="Adjust your filters or create a new sale" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canBulkProcess && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={
                          filtered.filter((s) => s.status === "pending").length > 0 &&
                          filtered
                            .filter((s) => s.status === "pending")
                            .every((s) => selected.has(s.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className={selected.has(sale.id) ? "bg-primary/5" : ""}
                  >
                    {canBulkProcess && (
                      <TableCell>
                        {sale.status === "pending" && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selected.has(sale.id)}
                            onChange={() => toggleSelect(sale.id)}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="font-medium hover:underline"
                      >
                        {sale.customer?.name || "N/A"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {sale.sale_type} / {sale.subtype}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.company_name}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(sale.charged_amount, currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[sale.status] || "default"} className="capitalize">
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.agent?.full_name || "N/A"}</TableCell>
                    <TableCell>{formatDate(sale.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/sales/${sale.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-transparent"
                          aria-label="View sale"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
