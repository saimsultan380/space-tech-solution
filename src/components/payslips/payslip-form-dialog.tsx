"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import { createPayslip, getPayslipAttendanceSummary, updatePayslip } from "@/lib/actions/payslips";
import type { Payslip, PayslipStatus } from "@/lib/types";

interface EmployeeOption {
  id: string;
  full_name: string;
  role: string;
  employee_id?: string | null;
  preferred_currency?: string | null;
}

interface PayslipFormDialogProps {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
  mode?: "create" | "edit";
  initialPayslip?: Payslip | null;
}

export function PayslipFormDialog({
  open,
  onClose,
  employees,
  mode = "create",
  initialPayslip = null,
}: PayslipFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    user_id: initialPayslip?.user_id || "",
    period_start: initialPayslip?.period_start || "",
    period_end: initialPayslip?.period_end || "",
    pay_date: initialPayslip?.pay_date || "",
    basic_salary: initialPayslip ? String(initialPayslip.basic_salary) : "",
    allowances: initialPayslip ? String(initialPayslip.allowances) : "0",
    deductions: initialPayslip ? String(initialPayslip.deductions) : "0",
    bonus: initialPayslip ? String(initialPayslip.bonus) : "0",
    status: initialPayslip?.status || "processed",
    // New fields
    employee_id_display: initialPayslip?.employee_id_display || "",
    joining_date: initialPayslip?.joining_date || "",
    category: initialPayslip?.category || "Permanent",
    department: initialPayslip?.department || "",
    job_position: initialPayslip?.job_position || "",
    father_name: initialPayslip?.father_name || "",
    pay_days: initialPayslip ? String(initialPayslip.pay_days) : "30",
    cnic_no: initialPayslip?.cnic_no || "",
    address: initialPayslip?.address || "",
    pay_rate: initialPayslip ? String(initialPayslip.pay_rate) : "0",
    gross_pay: initialPayslip ? String(initialPayslip.gross_pay) : "0",
    monthly_revenue: initialPayslip ? String(initialPayslip.monthly_revenue) : "0",
    chargeback_amount: initialPayslip ? String(initialPayslip.chargeback_amount) : "0",
    remaining: initialPayslip ? String(initialPayslip.remaining) : "0",
    commission: initialPayslip ? String(initialPayslip.commission) : "0",
    advance: initialPayslip ? String(initialPayslip.advance) : "0",
    late_attendance: initialPayslip ? String(initialPayslip.late_attendance) : "0",
    leaves: initialPayslip ? String(initialPayslip.leaves) : "0",
    paid_through: initialPayslip?.paid_through || "Bank",
    bank_account_no: initialPayslip?.bank_account_no || "",
    bank_branch: initialPayslip?.bank_branch || "",
  });

  useEffect(() => {
    setForm({
      user_id: initialPayslip?.user_id || "",
      period_start: initialPayslip?.period_start || "",
      period_end: initialPayslip?.period_end || "",
      pay_date: initialPayslip?.pay_date || "",
      basic_salary: initialPayslip ? String(initialPayslip.basic_salary) : "",
      allowances: initialPayslip ? String(initialPayslip.allowances) : "0",
      deductions: initialPayslip ? String(initialPayslip.deductions) : "0",
      bonus: initialPayslip ? String(initialPayslip.bonus) : "0",
      status: initialPayslip?.status || "processed",
      // New fields
      employee_id_display: initialPayslip?.employee_id_display || "",
      joining_date: initialPayslip?.joining_date || "",
      category: initialPayslip?.category || "Permanent",
      department: initialPayslip?.department || "",
      job_position: initialPayslip?.job_position || "",
      father_name: initialPayslip?.father_name || "",
      pay_days: initialPayslip ? String(initialPayslip.pay_days) : "30",
      cnic_no: initialPayslip?.cnic_no || "",
      address: initialPayslip?.address || "",
      pay_rate: initialPayslip ? String(initialPayslip.pay_rate) : "0",
      gross_pay: initialPayslip ? String(initialPayslip.gross_pay) : "0",
      monthly_revenue: initialPayslip ? String(initialPayslip.monthly_revenue) : "0",
      chargeback_amount: initialPayslip ? String(initialPayslip.chargeback_amount) : "0",
      remaining: initialPayslip ? String(initialPayslip.remaining) : "0",
      commission: initialPayslip ? String(initialPayslip.commission) : "0",
      advance: initialPayslip ? String(initialPayslip.advance) : "0",
      late_attendance: initialPayslip ? String(initialPayslip.late_attendance) : "0",
      leaves: initialPayslip ? String(initialPayslip.leaves) : "0",
      paid_through: initialPayslip?.paid_through || "Bank",
      bank_account_no: initialPayslip?.bank_account_no || "",
      bank_branch: initialPayslip?.bank_branch || "",
    });
  }, [initialPayslip, open]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  useEffect(() => {
    if (mode === "create" && form.user_id) {
      const emp = employeeMap.get(form.user_id);
      if (emp?.employee_id) {
        setForm((prev) => ({ ...prev, employee_id_display: emp.employee_id || "" }));
      }
    }
  }, [form.user_id, mode, employeeMap]);

  useEffect(() => {
    if (mode !== "create") return;
    if (!form.user_id || !form.period_start || !form.period_end) return;

    let active = true;
    (async () => {
      try {
        const summary = await getPayslipAttendanceSummary({
          user_id: form.user_id,
          period_start: form.period_start,
          period_end: form.period_end,
        });
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          late_attendance: String(summary.late_attendance ?? 0),
          leaves: String(summary.leaves ?? 0),
        }));
      } catch {
        setForm((prev) => prev);
      }
    })();

    return () => {
      active = false;
    };
  }, [mode, form.user_id, form.period_start, form.period_end]);

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.full_name} (${emp.role === "sales_agent" ? "Sales Agent" : "Processor"})`,
  }));

  const selectedEmployee = employeeMap.get(form.user_id);
  const netPay =
    Number(form.basic_salary || 0) +
    Number(form.allowances || 0) +
    Number(form.bonus || 0) +
    Number(form.commission || 0) +
    Number(form.advance || 0) -
    Number(form.deductions || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        user_id: form.user_id,
        period_start: form.period_start,
        period_end: form.period_end,
        pay_date: form.pay_date,
        basic_salary: Number(form.basic_salary || 0),
        allowances: Number(form.allowances || 0),
        deductions: Number(form.deductions || 0),
        bonus: Number(form.bonus || 0),
        currency: selectedEmployee?.preferred_currency || initialPayslip?.currency || "PKR",
        status: form.status as "processed" | "paid",
        // New fields
        employee_id_display: form.employee_id_display,
        joining_date: form.joining_date,
        category: form.category,
        department: form.department,
        job_position: form.job_position,
        father_name: form.father_name,
        pay_days: Number(form.pay_days || 0),
        cnic_no: form.cnic_no,
        address: form.address,
        pay_rate: Number(form.pay_rate || 0),
        gross_pay: Number(form.gross_pay || 0),
        monthly_revenue: Number(form.monthly_revenue || 0),
        chargeback_amount: Number(form.chargeback_amount || 0),
        remaining: Number(form.remaining || 0),
        commission: Number(form.commission || 0),
        advance: Number(form.advance || 0),
        late_attendance: Number(form.late_attendance || 0),
        leaves: Number(form.leaves || 0),
        paid_through: form.paid_through,
        bank_account_no: form.bank_account_no,
        bank_branch: form.bank_branch,
      };

      if (mode === "edit" && initialPayslip) {
        await updatePayslip({ id: initialPayslip.id, ...payload });
      } else {
        await createPayslip(payload);
      }
      onClose();
      if (mode !== "edit") {
        setForm({
          user_id: "",
          period_start: "",
          period_end: "",
          pay_date: "",
          basic_salary: "",
          allowances: "0",
          deductions: "0",
          bonus: "0",
          status: "processed",
          employee_id_display: "",
          joining_date: "",
          category: "Permanent",
          department: "",
          job_position: "",
          father_name: "",
          pay_days: "30",
          cnic_no: "",
          address: "",
          pay_rate: "0",
          gross_pay: "0",
          monthly_revenue: "0",
          chargeback_amount: "0",
          remaining: "0",
          commission: "0",
          advance: "0",
          late_attendance: "0",
          leaves: "0",
          paid_through: "Bank",
          bank_account_no: "",
          bank_branch: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Payslip" : "Generate Payslip"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6 overflow-y-auto px-1 pb-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="user_id"
              label="Employee"
              options={employeeOptions}
              placeholder="Select employee"
              value={form.user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
              required
            />
            <Input
              id="employee_id_display"
              label="Employee ID (Display)"
              placeholder="e.g. D004"
              value={form.employee_id_display}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id_display: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="period_start"
              label="Period Start"
              type="date"
              value={form.period_start}
              onChange={(e) => setForm((prev) => ({ ...prev, period_start: e.target.value }))}
              required
            />
            <Input
              id="period_end"
              label="Period End"
              type="date"
              value={form.period_end}
              onChange={(e) => setForm((prev) => ({ ...prev, period_end: e.target.value }))}
              required
            />
            <Input
              id="pay_date"
              label="Pay Date"
              type="date"
              value={form.pay_date}
              onChange={(e) => setForm((prev) => ({ ...prev, pay_date: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Employee Details */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Employee Profile Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="father_name"
              label="Father Name"
              value={form.father_name}
              onChange={(e) => setForm((prev) => ({ ...prev, father_name: e.target.value }))}
            />
            <Input
              id="cnic_no"
              label="CNIC No"
              placeholder="XXXXX-XXXXXXX-X"
              value={form.cnic_no}
              onChange={(e) => setForm((prev) => ({ ...prev, cnic_no: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="joining_date"
              label="Joining Date"
              type="date"
              value={form.joining_date}
              onChange={(e) => setForm((prev) => ({ ...prev, joining_date: e.target.value }))}
            />
            <Select
              id="category"
              label="Category"
              options={[
                { value: "Permanent", label: "Permanent" },
                { value: "Contract", label: "Contract" },
              ]}
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="department"
              label="Department"
              placeholder="e.g. Sales Department"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            />
            <Input
              id="job_position"
              label="Job Position"
              placeholder="e.g. Customer Sales Representative"
              value={form.job_position}
              onChange={(e) => setForm((prev) => ({ ...prev, job_position: e.target.value }))}
            />
          </div>
          <Input
            id="address"
            label="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="pay_days"
              label="Pay Days"
              type="number"
              value={form.pay_days}
              onChange={(e) => setForm((prev) => ({ ...prev, pay_days: e.target.value }))}
            />
            <Input
              id="pay_rate"
              label="Pay Rate"
              type="number"
              value={form.pay_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, pay_rate: e.target.value }))}
            />
            <Input
              id="gross_pay"
              label="Gross Pay"
              type="number"
              value={form.gross_pay}
              onChange={(e) => setForm((prev) => ({ ...prev, gross_pay: e.target.value }))}
            />
          </div>
        </div>

        {/* Revenue Section */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Tracking</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="monthly_revenue"
              label="Monthly Revenue"
              type="number"
              value={form.monthly_revenue}
              onChange={(e) => setForm((prev) => ({ ...prev, monthly_revenue: e.target.value }))}
            />
            <Input
              id="chargeback_amount"
              label="Chargeback"
              type="number"
              value={form.chargeback_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, chargeback_amount: e.target.value }))}
            />
            <Input
              id="remaining"
              label="Remaining"
              type="number"
              value={form.remaining}
              onChange={(e) => setForm((prev) => ({ ...prev, remaining: e.target.value }))}
            />
          </div>
        </div>

        {/* Salary Breakdown */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Salary Breakdown</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="basic_salary"
              label="Basic Salary"
              type="number"
              min="0"
              step="0.01"
              value={form.basic_salary}
              onChange={(e) => setForm((prev) => ({ ...prev, basic_salary: e.target.value }))}
              required
            />
            <Input
              id="allowances"
              label="Allowances"
              type="number"
              min="0"
              step="0.01"
              value={form.allowances}
              onChange={(e) => setForm((prev) => ({ ...prev, allowances: e.target.value }))}
              required
            />
            <Input
              id="bonus"
              label="Bonus"
              type="number"
              min="0"
              step="0.01"
              value={form.bonus}
              onChange={(e) => setForm((prev) => ({ ...prev, bonus: e.target.value }))}
              required
            />
            <Input
              id="commission"
              label="Commission"
              type="number"
              min="0"
              step="0.01"
              value={form.commission}
              onChange={(e) => setForm((prev) => ({ ...prev, commission: e.target.value }))}
            />
            <Input
              id="advance"
              label="Advance"
              type="number"
              min="0"
              step="0.01"
              value={form.advance}
              onChange={(e) => setForm((prev) => ({ ...prev, advance: e.target.value }))}
            />
            <Input
              id="deductions"
              label="Deductions"
              type="number"
              min="0"
              step="0.01"
              value={form.deductions}
              onChange={(e) => setForm((prev) => ({ ...prev, deductions: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="late_attendance"
              label="Late Attendance (Count)"
              type="number"
              value={form.late_attendance}
              onChange={(e) => setForm((prev) => ({ ...prev, late_attendance: e.target.value }))}
            />
            <Input
              id="leaves"
              label="Leaves (Count)"
              type="number"
              value={form.leaves}
              onChange={(e) => setForm((prev) => ({ ...prev, leaves: e.target.value }))}
            />
          </div>
        </div>

        {/* Bank Information */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="paid_through"
              label="Paid Through"
              options={[
                { value: "Bank", label: "Bank" },
                { value: "Cash", label: "Cash" },
                { value: "Cheque", label: "Cheque" },
              ]}
              value={form.paid_through}
              onChange={(e) => setForm((prev) => ({ ...prev, paid_through: e.target.value }))}
            />
            <Input
              id="bank_account_no"
              label="Account Number"
              value={form.bank_account_no}
              onChange={(e) => setForm((prev) => ({ ...prev, bank_account_no: e.target.value }))}
            />
          </div>
          <Input
            id="bank_branch"
            label="Bank Branch"
            value={form.bank_branch}
            onChange={(e) => setForm((prev) => ({ ...prev, bank_branch: e.target.value }))}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Calculated Net Pay</p>
              <p className={`text-2xl font-bold ${netPay < 0 ? "text-destructive" : "text-foreground"}`}>
                {netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-48">
              <Select
                id="status"
                label="Status"
                options={[
                  { value: "processed", label: "Processed" },
                  { value: "paid", label: "Paid" },
                ]}
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PayslipStatus }))}
                required
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive font-medium">
            {error}
          </p>
        )}

        <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t border-border/50 -mx-1 px-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || netPay < 0} className="min-w-[120px]">
            {loading ? <Spinner /> : mode === "edit" ? "Update Payslip" : "Save Payslip"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
