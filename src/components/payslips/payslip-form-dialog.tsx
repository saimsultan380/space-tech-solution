"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/loading";
import { createPayslip, updatePayslip } from "@/lib/actions/payslips";
import type { Payslip, PayslipStatus } from "@/lib/types";

interface EmployeeOption {
  id: string;
  full_name: string;
  role: string;
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
    notes: initialPayslip?.notes || "",
    status: initialPayslip?.status || "draft",
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
      notes: initialPayslip?.notes || "",
      status: initialPayslip?.status || "draft",
    });
  }, [initialPayslip, open]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.full_name} (${emp.role === "sales_agent" ? "Sales Agent" : "Processor"})`,
  }));

  const selectedEmployee = employeeMap.get(form.user_id);
  const netPay =
    Number(form.basic_salary || 0) +
    Number(form.allowances || 0) +
    Number(form.bonus || 0) -
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
        notes: form.notes,
        status: form.status as "draft" | "sent",
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
          notes: "",
          status: "draft",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Payslip" : "Generate Payslip"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Select
          id="user_id"
          label="Employee"
          options={employeeOptions}
          placeholder="Select employee"
          value={form.user_id}
          onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
          required
        />

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

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">Calculated Net Pay</p>
          <p className={`text-xl font-semibold ${netPay < 0 ? "text-destructive" : "text-foreground"}`}>
            {netPay.toFixed(2)}
          </p>
        </div>

        <Select
          id="status"
          label="Dispatch Mode"
          options={[
            { value: "draft", label: "Save as Draft" },
            { value: "sent", label: "Create and Send" },
          ]}
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PayslipStatus }))}
          required
        />

        <Textarea
          id="notes"
          label="Notes"
          placeholder="Add payroll notes, adjustment reasons, or remarks"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || netPay < 0}>
            {loading ? <Spinner /> : mode === "edit" ? "Update Payslip" : "Save Payslip"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
