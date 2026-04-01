"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { assignNextEmployeeIdForUser, updateUser } from "@/lib/actions/users";
import { getSidebarModuleOptionsForRole } from "@/lib/constants";
import { cn, formatCnic } from "@/lib/utils";
import type { UserRole, EmployeeCategory, PaidThrough } from "@/lib/types";
import { Pencil } from "lucide-react";
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

interface EditUserDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    employee_id?: string | null;
    role: string;
    allowed_modules?: string[] | null;
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
    paid_through?: string | null;
    bank_name?: string | null;
    bank_account_no?: string | null;
    bank_branch?: string | null;
  };
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: user.email,
    full_name: user.full_name,
    employee_id: user.employee_id?.trim() ?? "",
    role: user.role as UserRole,
    allowedModules: user.allowed_modules ?? [],
    joining_date: user.joining_date || "",
    category: (user.category || "Permanent") as EmployeeCategory,
    department: user.department || "",
    job_position: user.job_position || "",
    father_name: user.father_name || "",
    cnic: formatCnic(user.cnic || ""),
    address: user.address || "",
    pay_days: user.pay_days?.toString() || "30",
    pay_rate: user.pay_rate?.toString() || "0",
    gross_pay: user.gross_pay?.toString() || "0",
    basic_salary: user.basic_salary?.toString() || "0",
    paid_through: (user.paid_through || "Bank") as PaidThrough,
    bank_name: user.bank_name || "",
    bank_account_no: user.bank_account_no || "",
    bank_branch: user.bank_branch || "",
  });

  useEffect(() => {
    setForm({
      email: user.email,
      full_name: user.full_name,
      employee_id: user.employee_id?.trim() ?? "",
      role: user.role as UserRole,
      allowedModules: user.allowed_modules ?? [],
      joining_date: user.joining_date || "",
      category: (user.category || "Permanent") as EmployeeCategory,
      department: user.department || "",
      job_position: user.job_position || "",
      father_name: user.father_name || "",
      cnic: formatCnic(user.cnic || ""),
      address: user.address || "",
      pay_days: user.pay_days?.toString() || "30",
      pay_rate: user.pay_rate?.toString() || "0",
      gross_pay: user.gross_pay?.toString() || "0",
      basic_salary: user.basic_salary?.toString() || "0",
      paid_through: (user.paid_through || "Bank") as PaidThrough,
      bank_name: user.bank_name || "",
      bank_account_no: user.bank_account_no || "",
      bank_branch: user.bank_branch || "",
    });
  }, [user]);

  const roleModules = getSidebarModuleOptionsForRole(form.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await updateUser(user.id, {
        email: form.email,
        full_name: form.full_name,
        employee_id: form.employee_id,
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
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }

    setLoading(false);
  };

  const handleAutoAssignId = async () => {
    setAssigningId(true);
    setError("");
    try {
      const id = await assignNextEmployeeIdForUser(user.id);
      setForm((f) => ({ ...f, employee_id: id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign employee ID");
    }
    setAssigningId(false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Edit user">
        <Pencil className="h-3.5 w-3.5 text-[#3B6EF8]" />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-3xl">
        <DialogHeader className="items-start text-left border-b border-border/50 pb-4">
          <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex w-full flex-col text-left">
          <div className="w-full space-y-6 py-6 text-left">
            {/* Basic Information */}
            <div className="space-y-4 text-left">
              <h3 className="w-full text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Basic Information
              </h3>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Input
                      id="employee_id"
                      label="Employee ID"
                      placeholder="e.g. ST-0042"
                      value={form.employee_id}
                      onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                      className="font-mono font-semibold"
                    />
                  </div>
                  {!form.employee_id.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={assigningId || loading}
                      onClick={() => void handleAutoAssignId()}
                    >
                      {assigningId ? <Spinner /> : "Auto-assign next"}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Set a unique ID (e.g. ST-0042) or leave blank and click Save to auto-assign. If no ID is shown yet, use &quot;Auto-assign next&quot; to assign immediately.
                </p>
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
                  id="cnic"
                  label="CNIC"
                  placeholder="XXXXX-XXXXXXX-X"
                  value={form.cnic}
                  maxLength={15}
                  onChange={(e) => setForm((f) => ({ ...f, cnic: formatCnic(e.target.value) }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="joining_date"
                  label="Joining Date"
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                />
                <Input
                  id="address"
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4 border-t border-border pt-4 text-left">
              <h3 className="w-full text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Employment Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  id="role"
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as UserRole,
                      allowedModules: [],
                    }))
                  }
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
            <div className="space-y-4 border-t border-border pt-4 text-left">
              <h3 className="w-full text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Salary Information
              </h3>
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
            <div className="space-y-4 border-t border-border pt-4 text-left">
              <h3 className="w-full text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Payment Information
              </h3>
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
            <div className="space-y-3 pt-4 border-t border-border text-left">
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground text-left">Module Access</p>
                <p className="text-xs text-muted-foreground mt-1 text-left">
                  Select specific modules for this user. Leave empty for default role access.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {roleModules.map((mod) => {
                  const checked = form.allowedModules.includes(mod.value);
                  return (
                    <label
                      key={mod.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all hover:bg-muted/50",
                        checked ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
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
                      <span className="font-medium">{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 pt-6 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {loading ? <Spinner /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
