import type { ProcessingAccountImportPayload, ProcessingAccountStatus } from "@/lib/types";
import { PROCESSING_ACCOUNT_STATUSES } from "@/lib/constants";
import Papa from "papaparse";

export type { ProcessingAccountImportPayload };

export type ImportSkippedRow = { line: number; reason: string };

function slugifyHeader(key: string): string {
  return key
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[#.'"]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function buildNormalizedRecord(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = slugifyHeader(k);
    if (!key) continue;
    if (v == null || v === "") {
      out[key] = "";
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = String(v);
      continue;
    }
    out[key] = String(v).trim();
  }
  return out;
}

function pickField(norm: Record<string, string>, slugs: string[]): string {
  for (const slug of slugs) {
    const v = norm[slug];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function parseStatus(raw: string): ProcessingAccountStatus {
  const t = raw.trim();
  if (!t) return "active";
  const n = t.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const valid: ProcessingAccountStatus[] = [
    "active",
    "not_working",
    "closed",
    "reversal_issue",
    "under_review",
  ];
  if (valid.includes(n as ProcessingAccountStatus)) {
    return n as ProcessingAccountStatus;
  }
  for (const { value, label } of PROCESSING_ACCOUNT_STATUSES) {
    if (label.toLowerCase() === t.toLowerCase()) {
      return value as ProcessingAccountStatus;
    }
  }
  return "active";
}

function rowIsEmpty(norm: Record<string, string>): boolean {
  return Object.values(norm).every((v) => !v || !String(v).trim());
}

/**
 * Map one sheet/CSV record to an import payload. Requires account holder name.
 */
export function recordToImportPayload(
  record: Record<string, unknown>
): ProcessingAccountImportPayload | null {
  const norm = buildNormalizedRecord(record);
  if (rowIsEmpty(norm)) return null;

  const account_holder_name = pickField(norm, [
    "account_holder_name",
    "account_holder",
    "holder_name",
    "full_name",
    "name",
  ]);

  if (!account_holder_name.trim()) return null;

  const routing_number = pickField(norm, [
    "routing_number",
    "routing",
    "aba",
    "routing_no",
    "bank_routing",
  ]);

  const account_number = pickField(norm, [
    "account_number",
    "acct_number",
    "checking_account",
    "account_no",
  ]);

  const billing_address = pickField(norm, [
    "billing_address",
    "address",
    "mailing_address",
    "street_address",
  ]);

  const statusRaw = pickField(norm, ["status", "account_status", "state"]);
  const notes = pickField(norm, ["notes", "comments", "remarks", "description"]);

  return {
    account_holder_name: account_holder_name.trim(),
    routing_number: routing_number.trim(),
    account_number: account_number.trim(),
    billing_address: billing_address.trim(),
    status: parseStatus(statusRaw),
    notes: notes.trim(),
  };
}

export function mapRecordsToImportRows(
  records: Record<string, unknown>[]
): { rows: ProcessingAccountImportPayload[]; skipped: ImportSkippedRow[] } {
  const rows: ProcessingAccountImportPayload[] = [];
  const skipped: ImportSkippedRow[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const norm = buildNormalizedRecord(record);
    if (rowIsEmpty(norm)) return;

    const payload = recordToImportPayload(record);
    if (!payload) {
      skipped.push({
        line,
        reason: "Missing account holder name (or unrecognized columns).",
      });
      return;
    }
    rows.push(payload);
  });

  return { rows, skipped };
}

export function parseProcessingAccountsCsv(text: string): Record<string, unknown>[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) throw new Error("File is empty.");

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });

  const fatal = result.errors.find((e) => e.type === "Quotes" || e.code === "TooManyFields");
  if (fatal) {
    throw new Error(fatal.message || "Could not parse CSV.");
  }

  const data = result.data || [];
  return data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      obj[k] = v;
    }
    return obj;
  });
}

export async function parseProcessingAccountsXlsx(
  buffer: ArrayBuffer
): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return json;
}

export const PROCESSING_ACCOUNTS_CSV_TEMPLATE = `Account Holder Name,Routing Number,Account Number,Billing Address,Status,Notes
Example User,021000021,1234567890,"123 Main St, City ST 12345",active,
`;
