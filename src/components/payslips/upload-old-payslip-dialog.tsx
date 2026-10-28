"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import {
  createPayslip,
  uploadPayslipPdf,
} from "@/lib/actions/payslips";
import { formatCnic } from "@/lib/utils";
import { Upload, X, FileText } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

interface EmployeeOption {
  id: string;
  full_name: string;
  role: string;
  employee_id?: string | null;
}

interface UploadOldPayslipDialogProps {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
}

export function UploadOldPayslipDialog({
  open,
  onClose,
  employees,
}: UploadOldPayslipDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    user_id: "",
    period_start: "",
    period_end: "",
    pay_date: "",
    basic_salary: "",
    status: "paid" as "processed" | "paid",
  });

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedPdfFile(file);
    setError("");
  };

  const handleRemovePdf = () => {
    setSelectedPdfFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!selectedPdfFile) {
        throw new Error("Please select a PDF file to upload");
      }

      if (!form.user_id) {
        throw new Error("Please select an employee");
      }

      let pdfUrl: string | undefined;

      // Upload PDF first
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

      // Create minimal payslip record with uploaded PDF
      await createPayslip({
        user_id: form.user_id,
        period_start: form.period_start,
        period_end: form.period_end,
        pay_date: form.pay_date,
        basic_salary: Number(form.basic_salary || 0),
        allowances: 0,
        deductions: 0,
        bonus: 0,
        currency: "PKR",
        status: form.status,
        pdf_url: pdfUrl,
      });

      // Reset form
      setForm({
        user_id: "",
        period_start: "",
        period_end: "",
        pay_date: "",
        basic_salary: "",
        status: "paid",
      });
      setSelectedPdfFile(null);
      
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload payslip");
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.full_name} - ${emp.employee_id || "N/A"}`,
  }));

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Upload Old Payslip</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">
                Quick Upload for Historical Payslips
              </h4>
              <p className="mt-1 text-xs text-blue-700">
                Upload old payslip PDFs and assign them to team members. Just select the employee,
                enter basic dates, and upload the PDF file.
              </p>
            </div>
          </div>
        </div>

        {/* Employee Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Employee & Period Details
          </h3>
          
          <Select
            id="user_id"
            label="Select Employee *"
            options={employeeOptions}
            placeholder="Choose team member"
            value={form.user_id}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, user_id: e.target.value }))
            }
            required
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <DateField
              id="period_start"
              label="Period Start *"
              value={form.period_start}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, period_start: value }))
              }
              required
            />
            <DateField
              id="period_end"
              label="Period End *"
              value={form.period_end}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, period_end: value }))
              }
              required
            />
            <DateField
              id="pay_date"
              label="Pay Date *"
              value={form.pay_date}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, pay_date: value }))
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="basic_salary"
              label="Basic Salary *"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter basic salary amount"
              value={form.basic_salary}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, basic_salary: e.target.value }))
              }
              required
            />
            <Select
              id="status"
              label="Status *"
              options={[
                { value: "paid", label: "Paid (Recommended for old payslips)" },
                { value: "processed", label: "Processed" },
              ]}
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as "processed" | "paid",
                }))
              }
              required
            />
          </div>
        </div>

        {/* PDF Upload Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Upload Payslip PDF *
          </h3>

          {!selectedPdfFile ? (
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-8">
              <label htmlFor="pdf-upload-quick" className="cursor-pointer block">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-foreground">
                      Click to upload payslip PDF
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      PDF files only, maximum 10MB
                    </p>
                  </div>
                </div>
                <input
                  id="pdf-upload-quick"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  disabled={!form.user_id}
                />
              </label>
              {!form.user_id && (
                <p className="text-xs text-warning text-center mt-4">
                  ⚠️ Please select an employee first
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-md bg-green-100 p-2.5 mt-0.5">
                    <FileText className="h-6 w-6 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-900 truncate">
                      {selectedPdfFile.name}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {(selectedPdfFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={handleRemovePdf}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">
              ❌ {error}
            </p>
          </div>
        )}

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingPdf || !selectedPdfFile}
            className="min-w-[140px]"
          >
            {uploadingPdf ? (
              <>
                <Spinner />
                <span className="ml-2">Uploading...</span>
              </>
            ) : loading ? (
              <>
                <Spinner />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              "Upload Payslip"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
