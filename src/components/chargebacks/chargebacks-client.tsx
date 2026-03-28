"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select as SelectField } from "@/components/ui/select";
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
import { ChargebackFormDialog } from "./chargeback-form-dialog";
import { deleteChargeback, updateChargebackStatus } from "@/lib/actions/chargebacks";
import { formatDate } from "@/lib/utils";
import { CHARGEBACK_STATUSES } from "@/lib/constants";
import type { UserRole, ChargebackStatus } from "@/lib/types";
import { Plus, Trash2, Download } from "lucide-react";

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
      sale: {
        id: string;
        company_name: string;
        agent_id: string;
        agent: { full_name: string } | null;
      } | null;
    }>;
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userRole: UserRole;
}

export function ChargebacksClient({ chargebacksResponse, userRole }: ChargebacksClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: chargebacks, count, page, totalPages, pageSize } = chargebacksResponse;

  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canCreate = userRole === "super_admin" || userRole === "processor";
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
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDownloadReport = () => {
    if (chargebacks.length === 0) return;

    const headers = ["Sale", "Agent", "Date", "Reason", "Status", "Created At"];
    const rows = chargebacks.map((cb) => [
      cb.sale?.company_name || "",
      cb.sale?.agent?.full_name || "",
      cb.date,
      cb.reason,
      cb.status,
      cb.created_at,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const v = value ?? "";
            const needsQuotes = /[",\n]/.test(v);
            const escaped = v.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "chargebacks-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="h-4 w-4" />
            <span className="ml-2">Download Chargebacks Report</span>
          </Button>
          {canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Chargeback
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {count} chargeback{count !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chargebacks.length === 0 ? (
            <EmptyState title="No chargebacks" description="Chargebacks will appear here" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargebacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell className="font-medium">
                      {cb.sale?.company_name || "N/A"}
                    </TableCell>
                    <TableCell>{cb.sale?.agent?.full_name || "N/A"}</TableCell>
                    <TableCell>{formatDate(cb.date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{cb.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[cb.status] || "default"} className="capitalize">
                        {cb.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {updatingId === cb.id ? (
                          <Spinner />
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <SelectField
                              options={CHARGEBACK_STATUSES}
                              value={cb.status}
                              onChange={(e) => handleStatusChange(cb.id, e.target.value)}
                              className="w-32"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(cb.id)}
                              disabled={deletingId === cb.id}
                              title="Delete chargeback"
                              aria-label="Delete chargeback"
                            >
                              {deletingId === cb.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
