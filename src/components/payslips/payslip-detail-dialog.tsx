"use client";

import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import { Download, FileText, User, Briefcase, Calendar, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PayslipDetailDialogProps {
  payslip: Payslip | null;
  open: boolean;
  onClose: () => void;
}

export function PayslipDetailDialog({ payslip, open, onClose }: PayslipDetailDialogProps) {
  if (!payslip) return null;

  const totalEarnings =
    Number(payslip.basic_salary || 0) +
    Number(payslip.allowances || 0) +
    Number(payslip.bonus || 0) +
    Number(payslip.commission || 0) +
    Number(payslip.advance || 0);

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Payslip Details
          </DialogTitle>
          <Badge variant={payslip.status === "paid" ? "success" : "warning"} className="mr-8 capitalize">
            {payslip.status}
          </Badge>
        </div>
      </DialogHeader>

      <div className="mt-6 space-y-8 overflow-y-auto px-1 pb-4" style={{ maxHeight: "calc(100vh - 250px)" }}>
        {/* Employee & Basic Info */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <User className="h-4 w-4" />
            Employee Information
          </h3>
          <div className="grid gap-6 rounded-xl border border-border bg-muted/20 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Full Name" value={payslip.user?.full_name} />
            <DetailItem label="Employee ID" value={payslip.employee_id_display} />
            <DetailItem label="Father Name" value={payslip.father_name} />
            <DetailItem label="CNIC No" value={payslip.cnic_no} />
            <DetailItem label="Department" value={payslip.department} />
            <DetailItem label="Job Position" value={payslip.job_position} />
            <DetailItem label="Category" value={payslip.category} />
            <DetailItem label="Joining Date" value={payslip.joining_date ? formatDate(payslip.joining_date) : null} />
            <DetailItem label="Address" value={payslip.address} className="sm:col-span-2 lg:col-span-3" />
          </div>
        </section>

        {/* Period & Payment Info */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Pay Period & Dates
          </h3>
          <div className="grid gap-6 rounded-xl border border-border bg-muted/20 p-5 sm:grid-cols-3">
            <DetailItem label="Period Start" value={formatDate(payslip.period_start)} />
            <DetailItem label="Period End" value={formatDate(payslip.period_end)} />
            <DetailItem label="Pay Date" value={formatDate(payslip.pay_date)} />
          </div>
        </section>

        {/* Revenue Tracking */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Revenue Tracking
          </h3>
          <div className="grid gap-6 rounded-xl border border-border bg-muted/20 p-5 sm:grid-cols-3">
            <DetailItem label="Monthly Revenue" value={`${payslip.monthly_revenue || 0}$`} />
            <DetailItem label="Chargeback" value={`${payslip.chargeback_amount || 0}$`} />
            <DetailItem label="Remaining" value={`${payslip.remaining || 0}$`} />
          </div>
        </section>

        {/* Salary Breakdown */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            Salary Breakdown
          </h3>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-border bg-success/5 p-5">
              <h4 className="font-semibold text-success">Earnings</h4>
              <div className="space-y-3">
                <BreakdownRow label="Basic Salary" value={payslip.basic_salary} currency={payslip.currency} />
                <BreakdownRow label="Allowances" value={payslip.allowances} currency={payslip.currency} />
                <BreakdownRow label="Bonus" value={payslip.bonus} currency={payslip.currency} />
                <BreakdownRow label="Commission" value={payslip.commission} currency={payslip.currency} />
                <BreakdownRow label="Advance" value={payslip.advance} currency={payslip.currency} />
                <div className="border-t border-border pt-3">
                  <BreakdownRow label="Total Earnings" value={totalEarnings} currency={payslip.currency} className="font-bold text-success" />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-destructive/5 p-5">
              <h4 className="font-semibold text-destructive">Deductions</h4>
              <div className="space-y-3">
                <BreakdownRow label="Deductions" value={payslip.deductions} currency={payslip.currency} />
                <div className="border-t border-border pt-3">
                  <BreakdownRow label="Total Deductions" value={payslip.deductions} currency={payslip.currency} className="font-bold text-destructive" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Net Salary Summary */}
        <section className="rounded-2xl border border-border bg-primary/5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Net Salary Payable</p>
          <p className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">
            {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-border pt-6">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pay Mode:</span>
              <span className="font-semibold">{payslip.paid_through || "Bank Transfer"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold capitalize">{payslip.status}</span>
            </div>
          </div>
        </section>
      </div>

      <DialogFooter className="bg-background pt-4 border-t border-border/50">
        <Button variant="outline" onClick={onClose} className="min-w-[100px]">
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function DetailItem({ label, value, className }: { label: string; value?: string | number | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}

function BreakdownRow({ 
  label, 
  value, 
  currency, 
  isCount,
  className 
}: { 
  label: string; 
  value?: number | null; 
  currency?: string; 
  isCount?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {isCount ? value : formatCurrency(Number(value || 0), currency || "PKR")}
      </span>
    </div>
  );
}
