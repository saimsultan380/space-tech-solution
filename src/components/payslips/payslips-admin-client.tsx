"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { clonePayslipToNextMonth, deletePayslip, markPayslipAsSent } from "@/lib/actions/payslips";
import type { Payslip } from "@/lib/types";
import { Download, Plus, Send, ChevronLeft, ChevronRight, Pencil, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { PayslipFormDialog } from "./payslip-form-dialog";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface EmployeeRow {
  id: string;
  full_name: string;
  role: string;
  preferred_currency?: string | null;
}

interface PayslipsAdminClientProps {
  payslips: Payslip[];
  employees: EmployeeRow[];
}

export function PayslipsAdminClient({ payslips, employees }: PayslipsAdminClientProps) {
  const MENU_GAP = 8;
  const MENU_MARGIN = 8;
  const MENU_WIDTH = 220;
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [menuState, setMenuState] = useState<{ id: string; x: number; y: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(
    () => ({
      total: payslips.length,
      sent: payslips.filter((p) => p.status === "sent").length,
      draft: payslips.filter((p) => p.status === "draft").length,
    }),
    [payslips]
  );

  const filteredPayslips = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return payslips.filter((payslip) => {
      if (!isPayslipInMonth(payslip, activeMonth)) return false;
      if (statusFilter !== "all" && payslip.status !== statusFilter) return false;
      if (!query) return true;
      const text = [
        payslip.user?.full_name || "",
        payslip.user?.role || "",
        payslip.notes || "",
        payslip.status || "",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [payslips, activeMonth, statusFilter, searchTerm]);

  const monthLabel = useMemo(() => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  }, [activeMonth]);

  const shiftMonth = (delta: number) => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1 + delta, 1);
    setActiveMonth(toYearMonth(date));
  };

  const menuPayslip = useMemo(
    () => (menuState ? payslips.find((p) => p.id === menuState.id) || null : null),
    [menuState, payslips]
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

  const handleSend = async (payslipId: string) => {
    setSendingId(payslipId);
    try {
      await markPayslipAsSent(payslipId);
      router.refresh();
    } finally {
      setSendingId(null);
    }
  };

  const handleClone = async (payslipId: string, status: "draft" | "sent") => {
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
          <h1 className="text-3xl font-bold text-[#111827]">Payslips</h1>
          <p className="text-[#6B7280]">Generate, send, edit, and reuse monthly salary slips.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#3B6EF8] hover:bg-[#2E5EE8]">
          <Plus className="h-4 w-4" /> Generate Payslip
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#E9EEF7] bg-gradient-to-br from-white to-[#F8FAFF] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_18px_rgba(59,110,248,0.08)]">
          <CardContent className="pt-6">
            <p className="text-sm text-[#6B7280]">Total Payslips</p>
            <p className="text-3xl font-bold text-[#111827]">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E9EEF7] bg-gradient-to-br from-white to-[#F2FCF6] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_18px_rgba(16,185,129,0.08)]">
          <CardContent className="pt-6">
            <p className="text-sm text-[#6B7280]">Sent</p>
            <p className="text-3xl font-bold text-green-600">{totals.sent}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E9EEF7] bg-gradient-to-br from-white to-[#FFFBF2] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_18px_rgba(245,158,11,0.08)]">
          <CardContent className="pt-6">
            <p className="text-sm text-[#6B7280]">Draft</p>
            <p className="text-3xl font-bold text-amber-600">{totals.draft}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E9EEF7] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(15,23,42,0.05)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold text-[#111827]">Payroll Register</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-center text-sm font-semibold text-[#111827]">
                {monthLabel}
              </div>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Input
              id="search_payslip"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee, role, status, or notes..."
              className="h-10"
              label="Search"
            />
            <Select
              id="status_filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All" },
                { value: "sent", label: "Sent" },
                { value: "draft", label: "Draft" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">{payslip.user?.full_name || "N/A"}</TableCell>
                    <TableCell>{payslip.user?.role === "sales_agent" ? "Sales Agent" : "Processor"}</TableCell>
                    <TableCell>
                      {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                    </TableCell>
                    <TableCell>{formatDate(payslip.pay_date)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payslip.status === "sent" ? "success" : "warning"}>
                        {payslip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">
                      {payslip.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          data-actions-trigger="true"
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            const width = Math.min(MENU_WIDTH, Math.max(180, viewportWidth - MENU_MARGIN * 2));
                            const itemCount = payslip.status === "draft" ? 6 : 5;
                            const estimatedHeight = itemCount * 40 + 12;
                            const fitsBelow = rect.bottom + MENU_GAP + estimatedHeight <= viewportHeight - MENU_MARGIN;
                            const aboveY = rect.top - MENU_GAP - estimatedHeight;

                            const clampedX = Math.min(
                              Math.max(MENU_MARGIN, rect.right - width),
                              viewportWidth - width - MENU_MARGIN
                            );
                            const preferredY = fitsBelow ? rect.bottom + MENU_GAP : aboveY;
                            const clampedY = Math.min(
                              Math.max(MENU_MARGIN, preferredY),
                              viewportHeight - estimatedHeight - MENU_MARGIN
                            );

                            setMenuState((prev) =>
                              prev?.id === payslip.id
                                ? null
                                : {
                                    id: payslip.id,
                                    x: clampedX,
                                    y: clampedY,
                                    width,
                                  }
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
      </Card>

      {menuState && menuPayslip && (
        <div
          ref={menuRef}
          className="fixed z-[70] max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-1.5 shadow-xl"
          style={{ left: `${menuState.x}px`, top: `${menuState.y}px`, width: `${menuState.width}px` }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[#F8F9FB]"
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
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[#F8F9FB]"
            onClick={() => {
              setMenuState(null);
              downloadPayslipPdf(menuPayslip);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
          {menuPayslip.status === "draft" && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[#F8F9FB]"
              onClick={() => {
                setMenuState(null);
                handleSend(menuPayslip.id);
              }}
              disabled={sendingId === menuPayslip.id}
            >
              <Send className="h-3.5 w-3.5" />
              {sendingId === menuPayslip.id ? "Sending..." : "Send"}
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[#F8F9FB]"
            onClick={() => {
              setMenuState(null);
              handleClone(menuPayslip.id, "draft");
            }}
            disabled={cloningId === `${menuPayslip.id}-draft`}
          >
            <Copy className="h-3.5 w-3.5" />
            {cloningId === `${menuPayslip.id}-draft` ? "Cloning..." : "Next Month Draft"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[#F8F9FB]"
            onClick={() => {
              setMenuState(null);
              handleClone(menuPayslip.id, "sent");
            }}
            disabled={cloningId === `${menuPayslip.id}-sent`}
          >
            <Send className="h-3.5 w-3.5" />
            {cloningId === `${menuPayslip.id}-sent` ? "Cloning..." : "Next Month Send"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
    payDate.getFullYear() === year &&
    payDate.getMonth() + 1 === (month || 1);

  return overlapsPeriod || inPayMonth;
}
