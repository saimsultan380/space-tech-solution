"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import { Download, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import { PayslipDetailDialog } from "./payslip-detail-dialog";

interface PayslipsMyClientProps {
  payslips: Payslip[];
}

export function PayslipsMyClient({ payslips }: PayslipsMyClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  const filteredPayslips = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return payslips.filter((payslip) => {
      if (!isPayslipInMonth(payslip, activeMonth)) return false;
      if (!query) return true;
      const text = [
        payslip.employee_id_display || "",
        payslip.department || "",
        payslip.job_position || "",
        payslip.status || "",
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [payslips, activeMonth, searchTerm]);

  const monthLabel = useMemo(() => {
    const [year, month] = activeMonth.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(year, (month || 1) - 1, 1)
    );
  }, [activeMonth]);

  const shiftMonth = (delta: number) => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1 + delta, 1);
    setActiveMonth(toYearMonth(date));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Payslips</h1>
        <p className="text-muted-foreground">Track monthly payroll and download salary slips in PDF format.</p>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="space-y-4 border-b border-border pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg font-bold text-foreground">Payslip History</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg border-border hover:bg-muted" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-center text-sm font-bold text-foreground">
                {monthLabel}
              </div>
              <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg border-border hover:bg-muted" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            id="search_my_payslip"
            label="Search Payslips"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, department, position..."
            className="h-10"
          />
        </CardHeader>
        <CardContent>
          {filteredPayslips.length === 0 ? (
            <EmptyState
              title="No payslips found"
              description="No payslip records match this month or search query."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell>
                      {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                    </TableCell>
                    <TableCell>{formatDate(payslip.pay_date)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payslip.status === "paid" ? "success" : "warning"} className="capitalize">
                        {payslip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => setViewingPayslip(payslip)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadPayslipPdf(payslip)}>
                          <Download className="h-3.5 w-3.5" />
                          PDF
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
    payDate.getFullYear() === year &&
    payDate.getMonth() + 1 === (month || 1);

  return overlapsPeriod || inPayMonth;
}
