"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import {
  createPayslip,
  updatePayslip,
  uploadPayslipPdf,
  deletePayslipPdf,
} from "@/lib/actions/payslips";
import type { Payslip, PayslipStatus } from "@/lib/types";
import { formatCnic } from "@/lib/utils";
import { Upload, X, FileText } from "@/components/ui/icons";

interface EmployeeOption {
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
  paid_through?: string | null;
  bank_account_no?: string | null;
  bank_branch?: string | null;
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
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(
    initialPayslip?.pdf_url || null
  );

  const initialEmployeeId =
    initialPayslip?.employee_id_display ||
    initialPayslip?.user?.employee_id ||
    "";

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
    employee_id_display: initialEmployeeId,
    joining_date: initialPayslip?.joining_date || "",
    category: initialPayslip?.category || "Permanent",
    department: initialPayslip?.department || "",
    job_position: initialPayslip?.job_position || "",
    father_name: initialPayslip?.father_name || "",
    pay_days: initialPayslip ? String(initialPayslip.pay_days) : "30",
    cnic_no: formatCnic(initialPayslip?.cnic_no || ""),
    address: initialPayslip?.address || "",
    pay_rate: initialPayslip ? String(initialPayslip.pay_rate) : "0",
    gross_pay: initialPayslip ? String(initialPayslip.gross_pay) : "0",
    monthly_revenue: initialPayslip
      ? String(initialPayslip.monthly_revenue)
      : "0",
    chargeback_amount: initialPayslip
      ? String(initialPayslip.chargeback_amount)
      : "0",
    remaining: initialPayslip ? String(initialPayslip.remaining) : "0",
    commission: initialPayslip ? String(initialPayslip.commission) : "0",
    advance: initialPayslip ? String(initialPayslip.advance) : "0",
    late_attendance: initialPayslip
      ? String(initialPayslip.late_attendance)
      : "0",
    leaves: initialPayslip ? String(initialPayslip.leaves) : "0",
    paid_through: initialPayslip?.paid_through || "Bank",
    bank_account_no: initialPayslip?.bank_account_no || "",
    bank_branch: initialPayslip?.bank_branch || "",
  });

  useEffect(() => {
    const userEmployeeId = initialPayslip?.user?.employee_id || "";
    const storedEmployeeId = initialPayslip?.employee_id_display || "";
    const resolvedEmployeeId = storedEmployeeId || userEmployeeId;

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
      employee_id_display: resolvedEmployeeId,
      joining_date: initialPayslip?.joining_date || "",
      category: initialPayslip?.category || "Permanent",
      department: initialPayslip?.department || "",
      job_position: initialPayslip?.job_position || "",
      father_name: initialPayslip?.father_name || "",
      pay_days: initialPayslip ? String(initialPayslip.pay_days) : "30",
      cnic_no: formatCnic(initialPayslip?.cnic_no || ""),
      address: initialPayslip?.address || "",
      pay_rate: initialPayslip ? String(initialPayslip.pay_rate) : "0",
      gross_pay: initialPayslip ? String(initialPayslip.gross_pay) : "0",
      monthly_revenue: initialPayslip
        ? String(initialPayslip.monthly_revenue)
        : "0",
      chargeback_amount: initialPayslip
        ? String(initialPayslip.chargeback_amount)
        : "0",
      remaining: initialPayslip ? String(initialPayslip.remaining) : "0",
      commission: initialPayslip ? String(initialPayslip.commission) : "0",
      advance: initialPayslip ? String(initialPayslip.advance) : "0",
      late_attendance: initialPayslip
        ? String(initialPayslip.late_attendance)
        : "0",
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
      if (emp) {
        setForm((prev) => ({
          ...prev,
          employee_id_display: emp.employee_id || "",
          joining_date: emp.joining_date || "",
          category: emp.category || "Permanent",
          department: emp.department || "",
          job_position: emp.job_position || "",
          father_name: emp.father_name || "",
          cnic_no: formatCnic(emp.cnic || ""),
          address: emp.address || "",
          pay_days: emp.pay_days?.toString() || "30",
          pay_rate: emp.pay_rate?.toString() || "0",
          gross_pay: emp.gross_pay?.toString() || "0",
          basic_salary: emp.basic_salary?.toString() || "",
          paid_through: emp.paid_through || "Bank",
          bank_account_no: emp.bank_account_no || "",
          bank_branch: emp.bank_branch || "",
        }));
      }
    }
  }, [form.user_id, mode, employeeMap]);

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.full_name} (${emp.role === "sales_agent" ? "Sales Agent" : "Processor"})`,
  }));

  const selectedEmployee = employeeMap.get(form.user_id);
  const netPay =
    Number(form.basic_salary || 0) +
    Number(form.allowances || 0) +
    Number(form.bonus || 0) +
    Number(form.commission || 0) -
    Number(form.advance || 0) -
    Number(form.deductions || 0);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedPdfFile(file);
    setError("");
  };

  const handleRemovePdf = async () => {
    if (uploadedPdfUrl && mode === "edit") {
      // Delete from storage if it's an uploaded file
      try {
        await deletePayslipPdf(uploadedPdfUrl);
      } catch (err) {
        console.error("Failed to delete PDF:", err);
      }
    }
    setSelectedPdfFile(null);
    setUploadedPdfUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let pdfUrl = uploadedPdfUrl;

      // Upload PDF if a new file is selected
      if (selectedPdfFile && form.user_id) {
        setUploadingPdf(true);
        const formData = new FormData();
        formData.append("file", selectedPdfFile);
        formData.append("userId", form.user_id);

        try {
          const uploadResult = await uploadPayslipPdf(formData);
          pdfUrl = uploadResult.fullPath;
        } catch (uploadError) {
          throw new Error(
            `Failed to upload PDF: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`
          );
        } finally {
          setUploadingPdf(false);
        }
      }

      const payload = {
        user_id: form.user_id,
        period_start: form.period_start,
        period_end: form.period_end,
        pay_date: form.pay_date,
        basic_salary: Number(form.basic_salary || 0),
        allowances: Number(form.allowances || 0),
        deductions: Number(form.deductions || 0),
        bonus: Number(form.bonus || 0),
        currency: "PKR",
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
        pdf_url: pdfUrl || undefined,
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
        <DialogTitle>
          {mode === "edit" ? "Edit Payslip" : "Generate Payslip"}
        </DialogTitle>
      </DialogHeader>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-6 overflow-y-auto px-1 pb-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Basic Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="user_id"
              label="Employee"
              options={employeeOptions}
              placeholder="Select employee"
              value={form.user_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, user_id: e.target.value }))
              }
              required
            />
            <div className="space-y-1.5">
              <Input
                id="employee_id_display"
                label="Employee ID"
                value={form.employee_id_display || "—"}
                disabled
                className="bg-muted/50 font-mono font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                {mode === "edit"
                  ? "Value stored on this payslip when it was created or last saved."
                  : "Taken from the employee’s profile (auto-generated ID). Edit it only under Users if it must change."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="period_start"
              label="Period Start"
              type="date"
              value={form.period_start}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, period_start: e.target.value }))
              }
              required
            />
            <Input
              id="period_end"
              label="Period End"
              type="date"
              value={form.period_end}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, period_end: e.target.value }))
              }
              required
            />
            <Input
              id="pay_date"
              label="Pay Date"
              type="date"
              value={form.pay_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pay_date: e.target.value }))
              }
              required
            />
          </div>
        </div>

        {/* Employee Details */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Employee Profile Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="father_name"
              label="Father Name"
              value={form.father_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, father_name: e.target.value }))
              }
            />
            <Input
              id="cnic_no"
              label="CNIC No"
              placeholder="XXXXX-XXXXXXX-X"
              value={form.cnic_no}
              maxLength={15}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  cnic_no: formatCnic(e.target.value),
                }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="joining_date"
              label="Joining Date"
              type="date"
              value={form.joining_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, joining_date: e.target.value }))
              }
            />
            <Select
              id="category"
              label="Category"
              options={[
                { value: "Permanent", label: "Permanent" },
                { value: "Contract", label: "Contract" },
              ]}
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="department"
              label="Department"
              placeholder="e.g. Sales Department"
              value={form.department}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, department: e.target.value }))
              }
            />
            <Input
              id="job_position"
              label="Job Position"
              placeholder="e.g. Customer Sales Representative"
              value={form.job_position}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, job_position: e.target.value }))
              }
            />
          </div>
          <Input
            id="address"
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="pay_days"
              label="Pay Days"
              type="number"
              value={form.pay_days}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pay_days: e.target.value }))
              }
            />
            <Input
              id="pay_rate"
              label="Pay Rate"
              type="number"
              value={form.pay_rate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pay_rate: e.target.value }))
              }
            />
            <Input
              id="gross_pay"
              label="Gross Pay"
              type="number"
              value={form.gross_pay}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gross_pay: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Revenue Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Revenue Tracking
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="monthly_revenue"
              label="Monthly Revenue"
              type="number"
              value={form.monthly_revenue}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  monthly_revenue: e.target.value,
                }))
              }
            />
            <Input
              id="chargeback_amount"
              label="Chargeback"
              type="number"
              value={form.chargeback_amount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  chargeback_amount: e.target.value,
                }))
              }
            />
            <Input
              id="remaining"
              label="Remaining"
              type="number"
              value={form.remaining}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remaining: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Salary Breakdown */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Salary Breakdown
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="basic_salary"
              label="Basic Salary"
              type="number"
              min="0"
              step="0.01"
              value={form.basic_salary}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, basic_salary: e.target.value }))
              }
              required
            />
            <Input
              id="allowances"
              label="Allowances"
              type="number"
              min="0"
              step="0.01"
              value={form.allowances}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, allowances: e.target.value }))
              }
              required
            />
            <Input
              id="bonus"
              label="Bonus"
              type="number"
              min="0"
              step="0.01"
              value={form.bonus}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bonus: e.target.value }))
              }
              required
            />
            <Input
              id="commission"
              label="Commission"
              type="number"
              min="0"
              step="0.01"
              value={form.commission}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, commission: e.target.value }))
              }
            />
            <Input
              id="advance"
              label="Advance"
              type="number"
              min="0"
              step="0.01"
              value={form.advance}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, advance: e.target.value }))
              }
            />
            <Input
              id="deductions"
              label="Deductions"
              type="number"
              min="0"
              step="0.01"
              value={form.deductions}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, deductions: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="late_attendance"
              label="Late Attendance (Count)"
              type="number"
              min="0"
              step="1"
              value={form.late_attendance}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  late_attendance: e.target.value,
                }))
              }
            />
            <Input
              id="leaves"
              label="Leaves (Count)"
              type="number"
              min="0"
              step="1"
              value={form.leaves}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, leaves: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Bank Information */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Payment Details
          </h3>
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paid_through: e.target.value,
                  bank_account_no:
                    e.target.value === "Cash" ? "" : prev.bank_account_no,
                  bank_branch:
                    e.target.value === "Cash" ? "" : prev.bank_branch,
                }))
              }
            />
            {form.paid_through !== "Cash" ? (
              <Input
                id="bank_account_no"
                label={
                  form.paid_through === "Cheque"
                    ? "Cheque Number"
                    : "Account Number"
                }
                value={form.bank_account_no}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bank_account_no: e.target.value,
                  }))
                }
              />
            ) : (
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-foreground block text-left opacity-0 select-none">
                  Account Number
                </label>
                <div className="flex h-12 w-full items-center rounded-md border border-input bg-muted/30 px-3.5 text-sm text-muted-foreground sm:h-11">
                  Cash payment selected. Account details are not required.
                </div>
              </div>
            )}
          </div>
          {form.paid_through !== "Cash" && (
            <Input
              id="bank_branch"
              label={
                form.paid_through === "Cheque" ? "Cheque Bank" : "Bank Branch"
              }
              value={form.bank_branch}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bank_branch: e.target.value }))
              }
            />
          )}
        </div>

        {/* PDF Upload Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Upload Existing Payslip PDF
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload an old payslip PDF file in the same format as generated payslips. 
            This is useful for adding historical payslips to the system.
          </p>
          
          {!selectedPdfFile && !uploadedPdfUrl ? (
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-6">
              <label htmlFor="pdf-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Click to upload PDF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF files only, max 10MB
                    </p>
                  </div>
                </div>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  disabled={!form.user_id}
                />
              </label>
              {!form.user_id && (
                <p className="text-xs text-warning text-center mt-3">
                  Please select an employee first
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-md bg-primary/10 p-2 mt-0.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedPdfFile?.name || "Uploaded PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedPdfFile
                        ? `${(selectedPdfFile.size / 1024 / 1024).toFixed(2)} MB`
                        : "Previously uploaded"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRemovePdf}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
              Salary Summary
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="font-semibold text-success">
                  {(
                    Number(form.basic_salary || 0) +
                    Number(form.allowances || 0) +
                    Number(form.bonus || 0) +
                    Number(form.commission || 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Deductions
                </p>
                <p className="font-semibold text-destructive">
                  {(
                    Number(form.advance || 0) + Number(form.deductions || 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Net Pay
              </p>
              <p
                className={`text-2xl font-bold ${netPay < 0 ? "text-destructive" : "text-foreground"}`}
              >
                {netPay.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as PayslipStatus,
                  }))
                }
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

        <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t border-border -mx-1 px-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingPdf || netPay < 0}
            className="min-w-[120px]"
          >
            {uploadingPdf ? (
              <>
                <Spinner />
                <span className="ml-2">Uploading...</span>
              </>
            ) : loading ? (
              <Spinner />
            ) : mode === "edit" ? (
              "Update Payslip"
            ) : (
              "Save Payslip"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
