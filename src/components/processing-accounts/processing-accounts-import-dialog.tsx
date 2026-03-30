"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkImportProcessingAccounts } from "@/lib/actions/processing-accounts";
import {
  mapRecordsToImportRows,
  parseProcessingAccountsCsv,
  parseProcessingAccountsXlsx,
  PROCESSING_ACCOUNTS_CSV_TEMPLATE,
} from "@/lib/processing-accounts-import";
import type { ProcessingAccountImportPayload } from "@/lib/types";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

interface ProcessingAccountsImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProcessingAccountsImportDialog({
  open,
  onClose,
}: ProcessingAccountsImportDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProcessingAccountImportPayload[]>([]);
  const [skipped, setSkipped] = useState<{ line: number; reason: string }[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const reset = () => {
    setFileName(null);
    setParseError(null);
    setImportError(null);
    setRows([]);
    setSkipped([]);
    setSuccessCount(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([PROCESSING_ACCOUNTS_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "processing-accounts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (file: File) => {
    setParseError(null);
    setImportError(null);
    setSuccessCount(null);
    setFileName(file.name);
    const lower = file.name.toLowerCase();

    try {
      let records: Record<string, unknown>[];
      if (lower.endsWith(".csv")) {
        const text = await file.text();
        records = parseProcessingAccountsCsv(text);
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        records = await parseProcessingAccountsXlsx(buf);
      } else {
        throw new Error("Use a .csv, .xlsx, or .xls file.");
      }

      const { rows: mapped, skipped: sk } = mapRecordsToImportRows(records);
      setRows(mapped);
      setSkipped(sk);
      if (mapped.length === 0 && sk.length === 0) {
        setParseError("No data rows found. Check headers and try the sample template.");
      }
    } catch (e) {
      setRows([]);
      setSkipped([]);
      setParseError(e instanceof Error ? e.message : "Could not read file.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const runImport = () => {
    if (rows.length === 0) return;
    setImportError(null);
    startTransition(async () => {
      try {
        const result = await bulkImportProcessingAccounts(rows);
        if (result.error) {
          setImportError(result.error);
          return;
        }
        setSuccessCount(result.inserted);
        router.refresh();
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "Upload failed."
        );
      }
    });
  };

  const previewRows = rows.slice(0, 8);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="max-h-[92vh] max-w-3xl overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle>Upload processing accounts</DialogTitle>
        <DialogDescription>
          Upload a CSV (e.g. Save As CSV from Excel) or Excel workbook (.xlsx). The
          first sheet is used. Columns are matched by header name — use the template
          for the exact labels. Missing fields are allowed and can be updated later.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="sr-only"
          onChange={onFileChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose file
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={downloadTemplate}
            disabled={isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV template
          </Button>
        </div>

        {fileName && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            {fileName}
          </p>
        )}

        {parseError && (
          <p className="text-sm text-destructive">{parseError}</p>
        )}
        {importError && (
          <p className="text-sm text-destructive">{importError}</p>
        )}
        {successCount !== null && (
          <p className="text-sm font-medium text-success">
            Successfully uploaded {successCount} account
            {successCount === 1 ? "" : "s"}.
          </p>
        )}

        {rows.length > 0 && successCount === null && (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{rows.length}</span>{" "}
              account{rows.length === 1 ? "" : "s"} ready to upload.
              {skipped.length > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-warning">
                    {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped.
                  </span>
                </>
              )}
            </p>

            {skipped.length > 0 && (
              <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {skipped.slice(0, 12).map((s) => (
                  <div key={`${s.line}-${s.reason}`}>
                    Line {s.line}: {s.reason}
                  </div>
                ))}
                {skipped.length > 12 && (
                  <div>…and {skipped.length - 12} more</div>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account holder</TableHead>
                    <TableHead>Routing</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[140px] truncate font-medium">
                        {r.account_holder_name}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs">
                        {r.routing_number || "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs">
                        {r.account_number || "—"}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">
                        {r.billing_address || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > previewRows.length && (
              <p className="text-xs text-muted-foreground">
                Showing first {previewRows.length} of {rows.length} rows.
              </p>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          {successCount !== null ? "Close" : "Cancel"}
        </Button>
        {successCount === null && (
          <Button
            type="button"
            onClick={runImport}
            disabled={isPending || rows.length === 0}
          >
            {isPending ? "Uploading…" : `Upload ${rows.length} account${rows.length === 1 ? "" : "s"}`}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
