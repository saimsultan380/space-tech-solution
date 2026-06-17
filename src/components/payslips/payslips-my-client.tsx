"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Pagination } from "@/components/ui/pagination";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { TableDataExport } from "@/components/ui/table-data-export";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payslip } from "@/lib/types";
import {
  Download,
  Eye,
  FileText,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DropdownRangeDatePicker,
  toDateRangeFromFilters,
  toFilterDates,
} from "@/components/ui/dropdown-range-date-picker";
import { downloadPayslipPdf, previewPayslipPdf } from "@/lib/payslip-pdf";
import { PayslipDetailDialog } from "./payslip-detail-dialog";
import { getPayslipPdfUrl } from "@/lib/actions/payslips";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedUrlSearchInput } from "@/hooks/use-debounced-url-search-input";
import type { CompanySettings } from "@/lib/actions/company-settings";

interface PayslipsMyClientProps {
  payslipsResponse: {
    data: Payslip[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  companySettings: CompanySettings;
}

export function PayslipsMyClient({
  payslipsResponse,
  companySettings,
}: PayslipsMyClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    data: payslips,
    count,
    page,
    totalPages,
    pageSize,
  } = payslipsResponse;

  const updateFilters = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const {
    inputRef,
    inputValue: searchInput,
    onInputChange,
  } = useDebouncedUrlSearchInput(searchParams, updateFilters);
  const statusFilter = searchParams.get("status") || "all";
  const fromDateFilter = searchParams.get("from_date") || "";
  const toDateFilter = searchParams.get("to_date") || "";
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  const handleViewUploadedPdf = async (pdfUrl: string) => {
    try {
      const signedUrl = await getPayslipPdfUrl(pdfUrl);
      window.open(signedUrl, "_blank");
    } catch (err) {
      alert(
        `Failed to load PDF: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Payslips</h1>
        <p className="text-muted-foreground">
          Track monthly payroll and download salary slips in PDF format.
        </p>
      </div>

      <Card className="border-border bg-gradient-to-br from-cyan-500/[0.07] via-card to-card shadow-sm overflow-hidden">
        <CardHeader className="space-y-4 border-b border-border pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg font-bold text-foreground">
              Payslip History
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <TableDataExport
                filenameBase="my-payslips"
                headers={["Period", "Status"]}
                rows={payslips.map((p) => [
                  `${formatDate(p.period_start)} - ${formatDate(p.period_end)}`,
                  p.status,
                ])}
                disabled={payslips.length === 0}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_240px_160px]">
            <Input
              id="search_my_payslip"
              ref={inputRef}
              value={searchInput}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Search by ID, department, position..."
              className="h-10"
              label="Search"
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">Period</span>
              <DropdownRangeDatePicker
                value={toDateRangeFromFilters(fromDateFilter, toDateFilter)}
                onApply={(range) =>
                  updateFilters({ ...toFilterDates(range), page: 1 })
                }
                triggerClassName="h-10 w-full justify-start text-left font-normal border-border bg-background"
              />
            </div>
            <Select
              id="status_filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
              options={[
                { value: "all", label: "All" },
                { value: "processed", label: "Processed" },
                { value: "paid", label: "Paid" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <TableLoadingOverlay isLoading={isPending} />
          {payslips.length === 0 ? (
            <EmptyState
              title="No payslips found"
              description="No payslip records found."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <p className="text-xs font-medium text-foreground">
                          {formatDate(payslip.period_start)} –{" "}
                          {formatDate(payslip.period_end)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(payslip.period_start).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payslip.status === "paid" ? "success" : "warning"
                          }
                        >
                          {payslip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViewingPayslip(payslip)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payslip.pdf_url ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() =>
                                handleViewUploadedPdf(payslip.pdf_url!)
                              }
                              title="View uploaded PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  void previewPayslipPdf(payslip, companySettings)
                                }
                                title="Preview generated PDF"
                              >
                                <span className="text-[10px] font-semibold">
                                  PDF
                                </span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  downloadPayslipPdf(payslip, companySettings)
                                }
                                title="Download generated PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <div className="border-t border-border px-6 py-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
            totalItems={count}
            pageSize={pageSize}
          />
        </div>
      </Card>

      {viewingPayslip && (
        <PayslipDetailDialog
          open={!!viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          payslip={viewingPayslip}
        />
      )}
    </div>
  );
}


