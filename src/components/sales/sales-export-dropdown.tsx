"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
  ChevronDown,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAllSalesForExport } from "@/lib/queries/sales";
import { downloadTableCsv, downloadTableXlsx, type TableExportCell } from "@/lib/table-export";
import { generateSalesReportPDF } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";
import type { Sale } from "@/lib/types";

interface SalesExportDropdownProps {
  filters?: {
    sale_type?: string;
    agent_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  };
  className?: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isPhoneNumber(value: string, phone: string): boolean {
  const compact = value.replace(/[\s().+-]/g, "");
  if (!/^\d{7,}$/.test(compact)) return false;
  const phoneDigits = digitsOnly(phone);
  return !phoneDigits || compact === phoneDigits || phoneDigits.endsWith(compact) || compact.endsWith(phoneDigits);
}

function customerDisplayName(sale: Sale): string {
  const phone = sale.customer_phone || "";
  const candidates = [
    sale.customer_name,
    sale.account_holder_name,
    sale.policy_holder_name,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim() || "";
    if (!value || isPhoneNumber(value, phone)) continue;
    return value;
  }
  return "";
}

function companyDisplayNumber(sale: Sale): string {
  const phone = sale.customer_phone || "";
  const candidates = [
    sale.utility_company_service_number,
    sale.customer?.account_no,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim() || "";
    if (!value || isPhoneNumber(value, phone)) continue;
    return value;
  }
  return "";
}

export function SalesExportDropdown({
  filters,
  className,
}: SalesExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "csv" | "pdf" | null>(null);

  const fetchSalesData = async (): Promise<Sale[]> => {
    return await getAllSalesForExport(filters);
  };

  const handleExport = async (format: "xlsx" | "csv" | "pdf") => {
    if (exporting) return;
    setExporting(format);
    try {
      const sales = await fetchSalesData();
      if (!sales || sales.length === 0) {
        alert("No sales records found matching the current filters.");
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filenameBase = `sales-report-${dateStr}`;

      if (format === "xlsx" || format === "csv") {
        const headers = [
          "Sale Date",
          "Recorded Date",
          "Customer Name",
          "Customer Phone",
          "Company Name",
          "Service/Account #",
          "Sale Type",
          "Subtype",
          "Amount ($)",
          "Charged Amount ($)",
          "Chargeback Status",
          "Chargeback Date",
          "Chargeback Reason",
          "Agent Name",
          "Bill Payment Status",
        ];

        const rows: TableExportCell[][] = sales.map((s) => [
          s.sale_date ? formatDate(s.sale_date) : "N/A",
          s.created_at ? formatDate(s.created_at) : "N/A",
          customerDisplayName(s) || "N/A",
          s.customer_phone?.trim() || "—",
          s.company_name || "—",
          companyDisplayNumber(s) || "—",
          s.sale_type || "—",
          s.subtype || "—",
          s.amount != null ? Number(s.amount).toFixed(2) : "0.00",
          s.charged_amount != null ? Number(s.charged_amount).toFixed(2) : "0.00",
          s.has_chargeback ? `Chargeback (${s.chargeback_status || "open"})` : "None",
          s.chargeback_date ? formatDate(s.chargeback_date) : "—",
          s.chargeback_reason || "—",
          s.agent?.full_name || "N/A",
          s.bill_payment_status || "—",
        ]);

        if (format === "xlsx") {
          await downloadTableXlsx(headers, rows, filenameBase);
        } else {
          downloadTableCsv(headers, rows, filenameBase);
        }
      } else if (format === "pdf") {
        const headers = [
          "Date",
          "Customer",
          "Phone",
          "Company",
          "Type",
          "Amount",
          "Charged",
          "Chargeback",
          "Agent",
          "Pay Status",
        ];

        const rows: string[][] = sales.map((s) => [
          s.sale_date ? formatDate(s.sale_date) : "N/A",
          customerDisplayName(s) || "N/A",
          s.customer_phone?.trim() || "—",
          s.company_name || "—",
          s.sale_type ? `${s.sale_type} (${s.subtype || ""})` : "—",
          s.amount != null ? `$${Number(s.amount).toFixed(2)}` : "$0.00",
          s.charged_amount != null ? `$${Number(s.charged_amount).toFixed(2)}` : "$0.00",
          s.has_chargeback ? `CB: ${s.chargeback_status || "open"}` : "None",
          s.agent?.full_name || "N/A",
          s.bill_payment_status || "—",
        ]);

        const filterDescParts: string[] = [];
        if (filters?.from_date || filters?.to_date) {
          filterDescParts.push(`Period: ${filters.from_date || "Start"} to ${filters.to_date || "End"}`);
        }
        if (filters?.sale_type && filters.sale_type !== "all") {
          filterDescParts.push(`Type: ${filters.sale_type}`);
        }
        if (filters?.search) {
          filterDescParts.push(`Search: "${filters.search}"`);
        }
        const subtitle =
          filterDescParts.length > 0
            ? `${filterDescParts.join(" | ")} | Total records: ${sales.length}`
            : `Total records: ${sales.length} | Generated: ${dateStr}`;

        await generateSalesReportPDF({
          title: "Sales Report",
          subtitle,
          headers,
          rows,
          filename: `${filenameBase}.pdf`,
        });
      }
      setOpen(false);
    } catch (err) {
      console.error("[SalesExportDropdown] Export failed:", err);
      alert(err instanceof Error ? err.message : "Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={className}
          disabled={exporting !== null}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Download className="h-4 w-4 shrink-0" />
          )}
          <span>
            {exporting ? `Exporting (${exporting.toUpperCase()})…` : "Export Reports"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 shadow-xl">
        <div className="px-2 py-1.5 border-b border-border mb-1">
          <p className="text-xs font-semibold text-foreground">Export Sales Report</p>
          <p className="text-[11px] text-muted-foreground">
            Download report for cross-checking sales
          </p>
        </div>
        <div className="space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50"
            disabled={exporting !== null}
            onClick={() => void handleExport("xlsx")}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="flex-1 truncate">
              <p className="font-medium text-foreground">Excel Spreadsheet</p>
              <p className="text-[10px] text-muted-foreground">.xlsx (MS Excel, Google Sheets)</p>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50"
            disabled={exporting !== null}
            onClick={() => void handleExport("csv")}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileDown className="h-4 w-4" />
            </div>
            <div className="flex-1 truncate">
              <p className="font-medium text-foreground">CSV Document</p>
              <p className="text-[10px] text-muted-foreground">.csv (Comma-separated values)</p>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50"
            disabled={exporting !== null}
            onClick={() => void handleExport("pdf")}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 truncate">
              <p className="font-medium text-foreground">PDF Document</p>
              <p className="text-[10px] text-muted-foreground">.pdf (Printable styled report)</p>
            </div>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
