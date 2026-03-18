"use client";

import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
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
          <div className="grid gap-6 rounded-xl border border-border/50 bg-muted/20 p-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid gap-6 rounded-xl border border-border/50 bg-muted/20 p-5 sm:grid-cols-3">
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
          <div className="grid gap-6 rounded-xl border border-border/50 bg-muted/20 p-5 sm:grid-cols-3">
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
            <div className="space-y-4 rounded-xl border border-border/50 bg-emerald-50/30 p-5">
              <h4 className="font-semibold text-emerald-700">Earnings</h4>
              <div className="space-y-3">
                <BreakdownRow label="Basic Salary" value={payslip.basic_salary} currency={payslip.currency} />
                <BreakdownRow label="Allowances" value={payslip.allowances} currency={payslip.currency} />
                <BreakdownRow label="Bonus" value={payslip.bonus} currency={payslip.currency} />
                <BreakdownRow label="Commission" value={payslip.commission} currency={payslip.currency} />
                <BreakdownRow label="Advance" value={payslip.advance} currency={payslip.currency} />
                <div className="mt-2 border-t border-emerald-200/50 pt-2 font-bold text-emerald-800 flex justify-between">
                  <span>Total Earnings</span>
                  <span>{formatCurrency(totalEarnings, payslip.currency)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/50 bg-rose-50/30 p-5">
              <h4 className="font-semibold text-rose-700">Deductions & Attendance</h4>
              <div className="space-y-3">
                <BreakdownRow label="Late Attendance" value={payslip.late_attendance || 0} isCount />
                <BreakdownRow label="Leaves" value={payslip.leaves || 0} isCount />
                <BreakdownRow label="Deductions" value={payslip.deductions} currency={payslip.currency} />
                <div className="mt-2 border-t border-rose-200/50 pt-2 font-bold text-rose-800 flex justify-between">
                  <span>Total Deductions</span>
                  <span>{formatCurrency(Number(payslip.deductions || 0), payslip.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Details */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Payment Information
          </h3>
          <div className="grid gap-6 rounded-xl border border-border/50 bg-muted/20 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Paid Through" value={payslip.paid_through} />
            <DetailItem label="Bank Account" value={payslip.bank_account_no} />
            <DetailItem label="Bank Branch" value={payslip.bank_branch} />
          </div>
        </section>

        {/* Net Pay Summary */}
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/10 p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Net Pay</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(Number(payslip.net_pay || 0), payslip.currency)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => downloadPayslipPdf(payslip)} variant="default" className="gap-2 shadow-lg shadow-primary/20">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
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

function BreakdownRow({ label, value, currency, isCount }: { label: string; value?: number | null; currency?: string; isCount?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {isCount ? value : formatCurrency(Number(value || 0), currency || "PKR")}
      </span>
    </div>
  );
}
