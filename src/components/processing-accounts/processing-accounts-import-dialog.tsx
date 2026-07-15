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
  PROCESSING_ACCOUNTS_CARD_CSV_TEMPLATE,
  PROCESSING_ACCOUNTS_CHECKIN_CSV_TEMPLATE,
  PROCESSING_ACCOUNTS_CSV_TEMPLATE,
  type ProcessingAccountsImportMode,
} from "@/lib/processing-accounts-import";
import type { ProcessingAccountImportPayload } from "@/lib/types";
import { Building2, CreditCard, Download, FileSpreadsheet, Upload } from "@/components/ui/icons";

interface ProcessingAccountsImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: {
  value: ProcessingAccountsImportMode;
  label: string;
  description: string;
  icon: typeof Building2;
}[] = [
  {
    value: "auto",
    label: "Auto-detect",
    description: "Detect from headers (Card Numbers vs Routing) and row values",
    icon: FileSpreadsheet,
  },
  {
    value: "checkin",
    label: "CheckIn accounts",
    description: "Import every row as a CheckIn (routing / account number) record",
    icon: Building2,
  },
  {
    value: "card",
    label: "Credit / Debit cards",
    description: "Import every row as a card record (card number, expiry, CVV)",
    icon: CreditCard,
  },
];

export function ProcessingAccountsImportDialog({
  open,
  onClose,
}: ProcessingAccountsImportDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [importMode, setImportMode] = useState<ProcessingAccountsImportMode>("auto");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProcessingAccountImportPayload[]>([]);
  const [skipped, setSkipped] = useState<{ line: number; reason: string }[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const reset = () => {
    setFileName(null);
    setParseError(null);
    setImportError(null);
    setRows([]);
    setSkipped([]);
    setSuccessCount(null);
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = (kind: ProcessingAccountsImportMode | "mixed" = "mixed") => {
    const templates = {
      mixed: {
        body: PROCESSING_ACCOUNTS_CSV_TEMPLATE,
        name: "processing-accounts-template.csv",
      },
      checkin: {
        body: PROCESSING_ACCOUNTS_CHECKIN_CSV_TEMPLATE,
        name: "processing-accounts-checkin-template.csv",
      },
      card: {
        body: PROCESSING_ACCOUNTS_CARD_CSV_TEMPLATE,
        name: "processing-accounts-card-template.csv",
      },
      auto: {
        body: PROCESSING_ACCOUNTS_CSV_TEMPLATE,
        name: "processing-accounts-template.csv",
      },
    } as const;
    const { body, name } = templates[kind];
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (file: File, mode: ProcessingAccountsImportMode) => {
    setParseError(null);
    setImportError(null);
    setSuccessCount(null);
    setFileName(file.name);
    setPendingFile(file);
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

      const { rows: mapped, skipped: sk } = mapRecordsToImportRows(records, mode);
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
    if (file) void processFile(file, importMode);
  };

  const onModeChange = (mode: ProcessingAccountsImportMode) => {
    setImportMode(mode);
    if (pendingFile) void processFile(pendingFile, mode);
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
  const cardCount = rows.filter((r) => r.account_type === "card").length;
  const checkinCount = rows.length - cardCount;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="max-h-[92vh] max-w-3xl overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle>Upload processing accounts</DialogTitle>
        <DialogDescription>
          Choose whether this file is CheckIn accounts or credit/debit cards, then
          upload a CSV or Excel workbook (.xlsx). The first sheet is used. Column
          headers are matched by name — download a template for the exact labels.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">What are you uploading?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const selected = importMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  disabled={isPending}
                  className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
            onClick={() =>
              downloadTemplate(
                importMode === "card"
                  ? "card"
                  : importMode === "checkin"
                    ? "checkin"
                    : "mixed"
              )
            }
            disabled={isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Download{" "}
            {importMode === "card"
              ? "card"
              : importMode === "checkin"
                ? "CheckIn"
                : "CSV"}{" "}
            template
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
              account{rows.length === 1 ? "" : "s"} ready to upload
              {cardCount > 0 && checkinCount > 0 && (
                <>
                  {" "}
                  (
                  <span className="font-medium text-foreground">{cardCount}</span> card
                  {cardCount === 1 ? "" : "s"},{" "}
                  <span className="font-medium text-foreground">{checkinCount}</span>{" "}
                  CheckIn)
                </>
              )}
              {cardCount > 0 && checkinCount === 0 && (
                <>
                  {" "}
                  (<span className="font-medium text-foreground">all cards</span>)
                </>
              )}
              {checkinCount > 0 && cardCount === 0 && (
                <>
                  {" "}
                  (<span className="font-medium text-foreground">all CheckIn</span>)
                </>
              )}
              .
              {skipped.length > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-warning">
                    {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped.
                  </span>
                </>
              )}
            </p>

            {importMode === "card" && cardCount === 0 && (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                No card numbers were detected in this file. Make sure the column is
                named Card Numbers / Card Number (or Card / CC / PAN). You can still
                upload, but card fields may be empty.
              </p>
            )}

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
                    <TableHead>Type</TableHead>
                    <TableHead>Account holder</TableHead>
                    <TableHead>Routing / Card No.</TableHead>
                    <TableHead>Account No. / Expiry</TableHead>
                    <TableHead>CVV</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {r.account_type === "card" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                            Card
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            CheckIn
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate font-medium">
                        {r.account_holder_name}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs">
                        {r.account_type === "card"
                          ? r.card_number || "—"
                          : r.routing_number || "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs">
                        {r.account_type === "card"
                          ? r.expiration_date || "—"
                          : r.account_number || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.account_type === "card" ? r.cvv || "—" : "—"}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs">
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
