"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { createUser } from "@/lib/actions/users";
import type { UserRole, EmployeeCategory, PaidThrough } from "@/lib/types";
import { getSidebarModuleOptionsForRole } from "@/lib/constants";
import { formatCnic } from "@/lib/utils";
import { BankNameField } from "./bank-name-field";

const ROLE_OPTIONS = [
  { value: "sales_agent", label: "Sales Agent" },
  { value: "processor", label: "Processor" },
  { value: "super_admin", label: "Super Admin" },
];

const CATEGORY_OPTIONS = [
  { value: "Permanent", label: "Permanent" },
  { value: "Contract", label: "Contract" },
];

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "sales_agent" as UserRole,
    allowedModules: [] as string[],
    joining_date: "",
    category: "Permanent" as EmployeeCategory,
    department: "",
    job_position: "",
    father_name: "",
    cnic: "",
    address: "",
    pay_days: "30",
    pay_rate: "0",
    gross_pay: "0",
    basic_salary: "0",
    paid_through: "Bank" as PaidThrough,
    bank_name: "",
    bank_account_no: "",
    bank_branch: "",
  });

  const roleModuleOptions = useMemo(
    () => getSidebarModuleOptionsForRole(form.role),
    [form.role]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        allowedModules: form.allowedModules,
        joining_date: form.joining_date || null,
        category: form.category,
        department: form.department || null,
        job_position: form.job_position || null,
        father_name: form.father_name || null,
        cnic: form.cnic || null,
        address: form.address || null,
        pay_days: form.pay_days ? Number(form.pay_days) : 30,
        pay_rate: form.pay_rate ? Number(form.pay_rate) : 0,
        gross_pay: form.gross_pay ? Number(form.gross_pay) : 0,
        basic_salary: form.basic_salary ? Number(form.basic_salary) : 0,
        paid_through: form.paid_through,
        bank_name: form.paid_through === "Bank" ? form.bank_name || null : null,
        bank_account_no: form.paid_through === "Cash" ? null : form.bank_account_no || null,
        bank_branch: form.paid_through === "Cash" ? null : form.bank_branch || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Create New User</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-1 sm:pr-0"
      >
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Employee ID</p>
            <p className="text-sm text-muted-foreground mt-0.5 italic">Will be auto-generated upon creation (e.g. ST-0001)</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="full_name"
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
            />
            <Input
              id="father_name"
              label="Father's Name"
              value={form.father_name}
              onChange={(e) => setForm((f) => ({ ...f, father_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              placeholder="Min 6 characters"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="cnic"
              label="CNIC"
              placeholder="XXXXX-XXXXXXX-X"
              value={form.cnic}
              maxLength={15}
              onChange={(e) => setForm((f) => ({ ...f, cnic: formatCnic(e.target.value) }))}
            />
            <DateField
              id="joining_date"
              label="Joining Date"
              value={form.joining_date}
              onChange={(value) => setForm((f) => ({ ...f, joining_date: value }))}
            />
          </div>
          <Input
            id="address"
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>

        {/* Employment Details */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Employment Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="role"
              label="Role"
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value as UserRole;
                const allowed = new Set(
                  getSidebarModuleOptionsForRole(nextRole).map((m) => m.value)
                );
                setForm((f) => ({
                  ...f,
                  role: nextRole,
                  allowedModules: f.allowedModules.filter((h) => allowed.has(h)),
                }));
              }}
              required
            />
            <Select
              id="category"
              label="Category"
              options={CATEGORY_OPTIONS}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EmployeeCategory }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="department"
              label="Department"
              placeholder="e.g. Sales Department"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <Input
              id="job_position"
              label="Job Position"
              placeholder="e.g. Customer Sales Representative"
              value={form.job_position}
              onChange={(e) => setForm((f) => ({ ...f, job_position: e.target.value }))}
            />
          </div>
        </div>

        {/* Salary Information */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Salary Information</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="pay_days"
              label="Pay Days"
              type="number"
              value={form.pay_days}
              onChange={(e) => setForm((f) => ({ ...f, pay_days: e.target.value }))}
            />
            <Input
              id="pay_rate"
              label="Pay Rate"
              type="number"
              value={form.pay_rate}
              onChange={(e) => setForm((f) => ({ ...f, pay_rate: e.target.value }))}
            />
            <Input
              id="gross_pay"
              label="Gross Pay"
              type="number"
              value={form.gross_pay}
              onChange={(e) => setForm((f) => ({ ...f, gross_pay: e.target.value }))}
            />
          </div>
          <Input
            id="basic_salary"
            label="Basic Salary"
            type="number"
            value={form.basic_salary}
            onChange={(e) => setForm((f) => ({ ...f, basic_salary: e.target.value }))}
          />
        </div>

        {/* Payment Information */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Information</h3>
          <Select
            id="paid_through"
            label="Paid Through"
            options={[
              { value: "Bank", label: "Bank" },
              { value: "Cash", label: "Cash" },
              { value: "Cheque", label: "Cheque" },
            ]}
            value={form.paid_through}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paid_through: e.target.value as PaidThrough,
                bank_name: e.target.value === "Bank" ? f.bank_name : "",
                bank_account_no: e.target.value === "Cash" ? "" : f.bank_account_no,
                bank_branch: e.target.value === "Cash" ? "" : f.bank_branch,
              }))
            }
          />
          {form.paid_through === "Bank" && (
            <BankNameField
              value={form.bank_name}
              onChange={(bank_name) => setForm((f) => ({ ...f, bank_name }))}
              disabled={loading}
            />
          )}
          {form.paid_through !== "Cash" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="bank_account_no"
              label={form.paid_through === "Cheque" ? "Cheque Number" : "Bank Account Number"}
              value={form.bank_account_no}
              onChange={(e) => setForm((f) => ({ ...f, bank_account_no: e.target.value }))}
            />
            <Input
              id="bank_branch"
              label={form.paid_through === "Cheque" ? "Cheque Bank" : "Bank Branch"}
              value={form.bank_branch}
              onChange={(e) => setForm((f) => ({ ...f, bank_branch: e.target.value }))}
            />
          </div>
          )}
        </div>

        {/* Module Access */}
        <div className="space-y-2 pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground">Module Access</p>
          <p className="text-xs text-muted-foreground">
            Choose which sidebar modules this user can see. Leave empty for full access based on role.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roleModuleOptions.map((mod) => {
              const checked = form.allowedModules.includes(mod.value);
              return (
                <label
                  key={mod.value}
                  className="flex items-center gap-2 rounded-[4px] border border-border/60 bg-muted/40 px-2 py-1.5 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                    checked={checked}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        allowedModules: e.target.checked
                          ? [...f.allowedModules, mod.value]
                          : f.allowedModules.filter((v) => v !== mod.value),
                      }))
                    }
                  />
                  <span>{mod.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
