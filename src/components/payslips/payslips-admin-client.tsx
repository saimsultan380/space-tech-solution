"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  clonePayslipToNextMonth,
  deletePayslip,
  markPayslipAsPaid,
} from "@/lib/actions/payslips";
import type { Payslip } from "@/lib/types";
import {
  Download,
  Plus,
  Send,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Copy,
  MoreHorizontal,
  Trash2,
  Eye,
} from "lucide-react";
import { PayslipFormDialog } from "./payslip-form-dialog";
import { PayslipDetailDialog } from "./payslip-detail-dialog";
import { downloadPayslipPdf, previewPayslipPdf } from "@/lib/payslip-pdf";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CompanySettings } from "@/lib/actions/company-settings";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";

interface EmployeeRow {
  id: string;
  full_name: string;
  role: string;
  employee_id?: string | null;
  preferred_currency?: string | null;
  joining_date?: string | null;
  category?: string | null;
  department?: string | null;
  job_position?: string | null;
  father_name?: string | null;
  cnic?: string | null;
  address?: string | null;
  pay_days?: number | null;
  pay_rate?: number | null;
  gross_pay?: number | null;
  basic_salary?: number | null;
  bank_account_no?: string | null;
  bank_branch?: string | null;
}

interface PayslipsAdminClientProps {
  payslipsResponse: {
    data: Payslip[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  employees: EmployeeRow[];
  companySettings: CompanySettings;
}

export function PayslipsAdminClient({
  payslipsResponse,
  employees,
  companySettings,
}: PayslipsAdminClientProps) {
  const MENU_GAP = 8;
  const MENU_MARGIN = 8;
  const MENU_WIDTH = 220;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    data: payslips,
    count,
    page,
    totalPages,
    pageSize,
  } = payslipsResponse;

  const [showForm, setShowForm] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const { inputRef, inputValue: searchInput, onInputChange } = useDebouncedUrlSearchInput(
    searchParams,
    updateFilters,
  );
  const statusFilter = searchParams.get("status") || "all";
  const [activeMonth, setActiveMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [menuState, setMenuState] = useState<{
    id: string;
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(
    () => ({
      total: count,
      paid: payslips.filter((p) => p.status === "paid").length, // This is only for the current page now
      processed: payslips.filter((p) => p.status === "processed").length, // This is only for the current page now
    }),
    [payslips, count],
  );

  const filteredPayslips = useMemo(() => {
    // We still do some month filtering on client side for now as requested by existing logic
    // but the search and status filters are now partially handled by the server
    return payslips.filter((payslip) => {
      if (!isPayslipInMonth(payslip, activeMonth)) return false;
      return true;
    });
  }, [payslips, activeMonth]);

  const monthLabel = useMemo(() => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [activeMonth]);

  const shiftMonth = (delta: number) => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1 + delta, 1);
    setActiveMonth(toYearMonth(date));
  };

  const menuPayslip = useMemo(
    () =>
      menuState ? payslips.find((p) => p.id === menuState.id) || null : null,
    [menuState, payslips],
  );

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-actions-trigger='true']")) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuState(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!menuState) return;
    const closeMenu = () => setMenuState(null);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuState]);

  const handleMarkAsPaid = async (payslipId: string) => {
    setSendingId(payslipId);
    try {
      await markPayslipAsPaid(payslipId);
      router.refresh();
    } finally {
      setSendingId(null);
    }
  };

  const handleClone = async (
    payslipId: string,
    status: "processed" | "paid",
  ) => {
    setCloningId(`${payslipId}-${status}`);
    try {
      await clonePayslipToNextMonth(payslipId, status);
      router.refresh();
    } finally {
      setCloningId(null);
    }
  };

  const handleDelete = async (payslipId: string) => {
    if (!window.confirm("Are you sure you want to delete this salary slip?")) {
      return;
    }
    setDeletingId(payslipId);
    try {
      await deletePayslip(payslipId);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payslips</h1>
          <p className="text-muted-foreground">
            Generate, send, edit, and reuse monthly salary slips.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" /> Generate Payslip
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Payslips
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {totals.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Paid
            </p>
            <p className="mt-2 text-3xl font-bold text-success">
              {totals.paid}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Processed
            </p>
            <p className="mt-2 text-3xl font-bold text-warning">
              {totals.processed}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="space-y-4 border-b border-border pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg font-bold text-foreground">
              Payroll Register
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-lg border-border hover:bg-muted"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-center text-sm font-bold text-foreground">
                {monthLabel}
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-lg border-border hover:bg-muted"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Input
              id="search_payslip"
              ref={inputRef}
              value={searchInput}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Search by employee, role, id, or department..."
              className="h-10"
              label="Search"
            />
            <Select
              id="status_filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
              options={[
                { value: "all", label: "All" },
                { value: "processed", label: "Processed" },
                { value: "paid", label: "Paid" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {filteredPayslips.length === 0 ? (
            <EmptyState
              title="No payslips found"
              description="Try another month or update your search and status filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">
                      {payslip.user?.full_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payslip.employee_id_display || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {payslip.department || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(payslip.period_start)} -{" "}
                      {formatDate(payslip.period_end)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(payslip.pay_date)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(
                        Number(payslip.net_pay || 0),
                        payslip.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payslip.status === "paid" ? "success" : "warning"
                        }
                        className="capitalize"
                      >
                        {payslip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/5"
                          onClick={() => setViewingPayslip(payslip)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          data-actions-trigger="true"
                          onClick={(e) => {
                            const rect = (
                              e.currentTarget as HTMLButtonElement
                            ).getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            const width = Math.min(
                              MENU_WIDTH,
                              Math.max(180, viewportWidth - MENU_MARGIN * 2),
                            );
                            const itemCount =
                              payslip.status === "processed" ? 6 : 5;
                            const estimatedHeight = itemCount * 40 + 12;
                            const fitsBelow =
                              rect.bottom + MENU_GAP + estimatedHeight <=
                              viewportHeight - MENU_MARGIN;
                            const aboveY =
                              rect.top - MENU_GAP - estimatedHeight;

                            const clampedX = Math.min(
                              Math.max(MENU_MARGIN, rect.right - width),
                              viewportWidth - width - MENU_MARGIN,
                            );
                            const preferredY = fitsBelow
                              ? rect.bottom + MENU_GAP
                              : aboveY;
                            const clampedY = Math.min(
                              Math.max(MENU_MARGIN, preferredY),
                              viewportHeight - estimatedHeight - MENU_MARGIN,
                            );

                            setMenuState((prev) =>
                              prev?.id === payslip.id
                                ? null
                                : {
                                    id: payslip.id,
                                    x: clampedX,
                                    y: clampedY,
                                    width,
                                  },
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="border-t border-border px-6 py-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </div>
      </Card>

      {menuState && menuPayslip && (
        <div
          ref={menuRef}
          className="fixed z-[70] max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-xl"
          style={{
            left: `${menuState.x}px`,
            top: `${menuState.y}px`,
            width: `${menuState.width}px`,
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setMenuState(null);
              setEditingPayslip(menuPayslip);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setMenuState(null);
              void previewPayslipPdf(menuPayslip, companySettings);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview PDF
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setMenuState(null);
              downloadPayslipPdf(menuPayslip, companySettings);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
          {menuPayslip.status === "processed" && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setMenuState(null);
                handleMarkAsPaid(menuPayslip.id);
              }}
              disabled={sendingId === menuPayslip.id}
            >
              <Send className="h-3.5 w-3.5" />
              {sendingId === menuPayslip.id ? "Paying..." : "Mark as Paid"}
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setMenuState(null);
              handleClone(menuPayslip.id, "processed");
            }}
            disabled={cloningId === `${menuPayslip.id}-processed`}
          >
            <Copy className="h-3.5 w-3.5" />
            {cloningId === `${menuPayslip.id}-processed`
              ? "Cloning..."
              : "Next Month Processed"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setMenuState(null);
              handleClone(menuPayslip.id, "paid");
            }}
            disabled={cloningId === `${menuPayslip.id}-paid`}
          >
            <Send className="h-3.5 w-3.5" />
            {cloningId === `${menuPayslip.id}-paid`
              ? "Cloning..."
              : "Next Month Paid"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-destructive/10"
            onClick={() => {
              setMenuState(null);
              handleDelete(menuPayslip.id);
            }}
            disabled={deletingId === menuPayslip.id}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deletingId === menuPayslip.id ? "Deleting..." : "Delete Salary"}
          </button>
        </div>
      )}

      {showForm && (
        <PayslipFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          employees={employees}
        />
      )}
      {editingPayslip && (
        <PayslipFormDialog
          open={!!editingPayslip}
          onClose={() => setEditingPayslip(null)}
          employees={employees}
          mode="edit"
          initialPayslip={editingPayslip}
        />
      )}
      {viewingPayslip && (
        <PayslipDetailDialog
          open={!!viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          payslip={viewingPayslip}
        />
      )}
    </div>
  );
}

function toYearMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isPayslipInMonth(payslip: Payslip, activeMonth: string) {
  const [year, month] = activeMonth.split("-").map(Number);
  const monthStart = new Date(year, (month || 1) - 1, 1);
  const monthEnd = new Date(year, month || 1, 0);

  const periodStart = new Date(payslip.period_start);
  const periodEnd = new Date(payslip.period_end);
  const payDate = new Date(payslip.pay_date);

  const overlapsPeriod = periodStart <= monthEnd && periodEnd >= monthStart;
  const inPayMonth =
    payDate.getFullYear() === year && payDate.getMonth() + 1 === (month || 1);

  return overlapsPeriod || inPayMonth;
}
