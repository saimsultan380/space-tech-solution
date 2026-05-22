"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import {
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from "@/components/ui/icons";
import { downloadPayslipPdf, previewPayslipPdf } from "@/lib/payslip-pdf";
import { PayslipDetailDialog } from "./payslip-detail-dialog";

interface PayslipHistoryProps {
  employeeName: string;
  employeeId: string;
  payslips: Payslip[];
}

function isPayslipInMonth(payslip: Payslip, yearMonth: string): boolean {
  const [year, month] = yearMonth.split("-").map(Number);
  const payDateObj = new Date(payslip.pay_date);
  return (
    payDateObj.getFullYear() === year && payDateObj.getMonth() + 1 === month
  );
}

function toYearMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function PayslipHistory({
  employeeName,
  employeeId,
  payslips,
}: PayslipHistoryProps) {
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString(),
  );

  // Get all unique years from payslips
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    payslips.forEach((p) => {
      const year = new Date(p.pay_date).getFullYear();
      yearSet.add(year);
    });
    return Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((y) => ({ value: y.toString(), label: y.toString() }));
  }, [payslips]);

  // Filter payslips by selected year
  const filteredPayslips = useMemo(() => {
    return payslips
      .filter((p) => {
        const year = new Date(p.pay_date).getFullYear().toString();
        return year === filterYear;
      })
      .sort(
        (a, b) =>
          new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime(),
      );
  }, [payslips, filterYear]);

  const totalEarnings = useMemo(() => {
    return filteredPayslips.reduce((sum, p) => {
      const earnings =
        Number(p.basic_salary || 0) +
        Number(p.allowances || 0) +
        Number(p.bonus || 0) +
        Number(p.commission || 0);
      return sum + earnings;
    }, 0);
  }, [filteredPayslips]);

  const totalDeductions = useMemo(() => {
    return filteredPayslips.reduce((sum, p) => {
      const deductions = Number(p.deductions || 0) + Number(p.advance || 0);
      return sum + deductions;
    }, 0);
  }, [filteredPayslips]);

  const totalNetPay = useMemo(() => {
    return filteredPayslips.reduce((sum, p) => {
      return sum + Number(p.net_pay || 0);
    }, 0);
  }, [filteredPayslips]);

  const getStatusColor = (status: string) => {
    return status === "paid" ? "success" : "warning";
  };

  return (
    <>
      <Card className="border-border bg-gradient-to-br from-blue-500/[0.07] via-card to-card shadow-sm overflow-hidden">
        <CardHeader className="space-y-4 border-b border-border pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                {employeeName} - Payslip History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Employee ID: {employeeId}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                id="history_year_filter"
                label="Year"
                options={years}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="min-w-[120px]"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filteredPayslips.length === 0 ? (
            <EmptyState
              title="No payslips found"
              description={`No payslip records found for ${employeeName} in ${filterYear}.`}
            />
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-success/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Total Earnings ({filteredPayslips.length} months)
                  </p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(
                      totalEarnings,
                      filteredPayslips[0]?.currency || "PKR",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-destructive/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Total Deductions
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(
                      totalDeductions,
                      filteredPayslips[0]?.currency || "PKR",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Total Net Pay
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      totalNetPay,
                      filteredPayslips[0]?.currency || "PKR",
                    )}
                  </p>
                </div>
              </div>

              {/* Payslips Table */}
              <div className="overflow-x-auto">
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
                      <TableRow key={payslip.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-sm">
                          {formatDate(payslip.period_start)} -{" "}
                          {formatDate(payslip.period_end)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(payslip.pay_date)}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          {formatCurrency(
                            Number(payslip.net_pay || 0),
                            payslip.currency || "PKR",
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusColor(payslip.status)}
                            className="capitalize"
                          >
                            {payslip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => setViewingPayslip(payslip)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => downloadPayslipPdf(payslip)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDetailDialog
        payslip={viewingPayslip}
        open={!!viewingPayslip}
        onClose={() => setViewingPayslip(null)}
      />
    </>
  );
}
